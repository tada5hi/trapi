/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    BaseType,
    EnumType,
    IntersectionType,
    Method,
    Parameter,
    RefObjectType,
    Response,
    Type,
    UnionType,
} from '@trapi/metadata';
import {
    ParameterSource,
    TypeName,
    isAnyType,
    isBinaryType,
    isEnumType,
    isNeverType,
    isRefEnumType,
    isRefObjectType,
    isUndefinedType,
    isVoidType,
} from '@trapi/metadata';
import path from 'node:path';
import { URL } from 'node:url';
import { merge } from 'smob';

import type {
    BaseSchema,
    OperationV2,
    ParameterV2,
    Path,
    ResponseV2,
    SchemaV2,
    SecurityV2,
    SpecV2,
} from '../../../core/schema';
import { DataTypeName, ParameterSourceV2 } from '../../../core/schema';
import type { SecurityDefinitions } from '../../../core/types';
import { SwaggerError, SwaggerErrorCode } from '../../../core/error';
import { normalizePathParameters } from '../../../core/utils';
import { AbstractSpecGenerator } from '../abstract';

export class V2Generator extends AbstractSpecGenerator<SpecV2, SchemaV2> {
    async build() : Promise<SpecV2> {
        if (typeof this.spec !== 'undefined') {
            return this.spec;
        }

        let spec: SpecV2 = {
            definitions: this.buildSchemasForReferenceTypes(),
            info: this.buildInfo(),
            paths: this.buildPaths(),
            swagger: '2.0',
        };

        spec.securityDefinitions = this.config.securityDefinitions ?
            V2Generator.translateSecurityDefinitions(this.config.securityDefinitions) :
            {};

        if (this.config.consumes) {
            spec.consumes = this.config.consumes;
        }

        if (this.config.produces) {
            spec.produces = this.config.produces;
        }

        if (
            this.config.servers &&
            this.config.servers.length > 0
        ) {
            const url = new URL(this.config.servers[0].url, 'http://localhost:3000/');

            spec.host = url.host;
            if (url.pathname) {
                spec.basePath = url.pathname;
            }
        }

        if (this.config.specificationExtra) {
            spec = merge(spec, this.config.specificationExtra);
        }

        this.spec = spec;

        await this.save();

        return spec;
    }

    private static translateSecurityDefinitions(securityDefinitions: SecurityDefinitions) : Record<string, SecurityV2> {
        const definitions : Record<string, SecurityV2> = {};

        const keys = Object.keys(securityDefinitions);
        for (const key of keys) {
            const securityDefinition = securityDefinitions[key];

            switch (securityDefinition.type) {
                case 'http':
                    if (securityDefinition.scheme === 'basic') {
                        definitions[key] = { type: 'basic' };
                    }
                    break;
                case 'apiKey':
                    definitions[key] = securityDefinition;
                    break;
                case 'oauth2':
                    if (securityDefinition.flows.implicit) {
                        definitions[`${key}Implicit`] = {
                            type: 'oauth2',
                            flow: 'implicit',
                            authorizationUrl: securityDefinition.flows.implicit.authorizationUrl,
                            scopes: securityDefinition.flows.implicit.scopes,
                        };
                    }

                    if (securityDefinition.flows.password) {
                        definitions[`${key}Password`] = {
                            type: 'oauth2',
                            flow: 'password',
                            tokenUrl: securityDefinition.flows.password.tokenUrl,
                            scopes: securityDefinition.flows.password.scopes,
                        };
                    }

                    if (securityDefinition.flows.authorizationCode) {
                        definitions[`${key}AccessCode`] = {
                            type: 'oauth2',
                            flow: 'accessCode',
                            tokenUrl: securityDefinition.flows.authorizationCode.tokenUrl,
                            authorizationUrl: securityDefinition.flows.authorizationCode.authorizationUrl,
                            scopes: securityDefinition.flows.authorizationCode.scopes,
                        };
                    }

                    if (securityDefinition.flows.clientCredentials) {
                        definitions[`${key}Application`] = {
                            type: 'oauth2',
                            flow: 'application',
                            tokenUrl: securityDefinition.flows.clientCredentials.tokenUrl,
                            scopes: securityDefinition.flows.clientCredentials.scopes,
                        };
                    }

                    break;
            }
        }

        return definitions;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected resolveAdditionalProperties(type: BaseType): SchemaV2 | boolean {
        return true;
    }

    protected markPropertyDeprecated(schema: SchemaV2): void {
        schema['x-deprecated'] = true;
    }


    /*
        Path & Parameter ( + utils)
     */

    private buildPaths() {
        const output: Record<string, Path<OperationV2, ResponseV2>> = {};

        const unique = <T extends unknown[]>(input: T) : T => [...new Set(input)] as T;

        this.metadata.controllers.forEach((controller) => {
            controller.methods.forEach((method) => {
                let fullPath = path.posix.join('/', (controller.path ? controller.path : ''), method.path);
                fullPath = normalizePathParameters(fullPath);

                method.consumes = unique([...controller.consumes, ...method.consumes]);
                method.produces = unique([...controller.produces, ...method.produces]);
                method.tags = unique([...controller.tags, ...method.tags]);
                method.security = method.security || controller.security;
                // todo: unique for objects
                method.responses = unique([...controller.responses, ...method.responses]);

                output[fullPath] = output[fullPath] || {};
                output[fullPath][method.method] = this.buildMethod(method);
            });
        });

        return output;
    }

    private buildMethod(method: Method) : OperationV2 {
        const output = this.buildOperation(method);
        output.consumes = this.buildMethodConsumes(method);

        output.description = method.description;
        if (method.summary) {
            output.summary = method.summary;
        }

        if (method.deprecated) { output.deprecated = method.deprecated; }
        if (method.tags.length) { output.tags = method.tags; }
        if (method.security) {
            output.security = method.security;
        }

        const parameters = this.groupParameters(method.parameters);

        output.parameters = [
            ...(parameters[ParameterSource.PATH] || []),
            ...(parameters[ParameterSource.QUERY_PROP] || []),
            ...(parameters[ParameterSource.HEADER] || []),
            ...(parameters[ParameterSource.FORM_DATA] || []),
        ].map((p) => this.buildParameter(p));

        // ignore ParameterSource.QUERY!

        // ------------------------------------------------------

        const bodyParameters = (parameters[ParameterSource.BODY] || []);
        if (bodyParameters.length > 1) {
            throw new SwaggerError({
                message: `Only one body parameter allowed per method, but ${bodyParameters.length} found in '${method.name}'.`,
                code: SwaggerErrorCode.BODY_PARAMETER_DUPLICATE,
            });
        }

        const bodyParameter = bodyParameters.length > 0 ?
            this.buildParameter(bodyParameters[0]) :
            undefined;

        const bodyPropParams = parameters[ParameterSource.BODY_PROP] || [];
        if (bodyPropParams.length > 0) {
            const schema : BaseSchema<SchemaV2> = {
                type: DataTypeName.OBJECT,
                title: 'Body',
                properties: {},
            };

            const required : string[] = [];

            for (const bodyPropParam of bodyPropParams) {
                const bodyProp = this.getSchemaForType(bodyPropParam.type);
                bodyProp.default = bodyPropParam.default;
                bodyProp.description = bodyPropParam.description;
                bodyProp.example = bodyPropParam.examples;

                if (bodyProp.required) {
                    required.push(bodyPropParam.name);
                }

                schema.properties[bodyPropParam.name] = bodyProp;
            }

            if (
                bodyParameter &&
                bodyParameter.in === ParameterSourceV2.BODY
            ) {
                if (bodyParameter.schema.type === DataTypeName.OBJECT) {
                    bodyParameter.schema.properties = {
                        ...(bodyParameter.schema.properties || {}),
                        ...schema.properties,
                    };

                    bodyParameter.schema.required = [
                        ...(bodyParameter.schema.required || []),
                        ...required,
                    ];
                } else {
                    bodyParameter.schema = schema;
                }

                output.parameters.push(bodyParameter);
            } else {
                const parameter : ParameterV2 = {
                    in: ParameterSourceV2.BODY,
                    name: 'body',
                    schema,
                };

                if (required.length) {
                    parameter.schema.required = required;
                }

                output.parameters.push(parameter);
            }
        } else if (bodyParameter) {
            output.parameters.push(bodyParameter);
        }

        for (let i = 0; i < method.extensions.length; i++) {
            output[method.extensions[i].key] = method.extensions[i].value;
        }

        return output;
    }

    private transformParameterSource(
        source: `${ParameterSource}`,
    ) : `${ParameterSourceV2}` | undefined {
        if (
            source === ParameterSource.BODY
        ) {
            return ParameterSourceV2.BODY;
        }

        if (source === ParameterSource.FORM_DATA) {
            return ParameterSourceV2.FORM_DATA;
        }

        if (source === ParameterSource.HEADER) {
            return ParameterSourceV2.HEADER;
        }

        if (source === ParameterSource.PATH) {
            return ParameterSourceV2.PATH;
        }

        if (source === ParameterSource.QUERY || source === ParameterSource.QUERY_PROP) {
            return ParameterSourceV2.QUERY;
        }

        return undefined;
    }

    protected buildParameter(input: Parameter): ParameterV2 {
        const sourceIn = this.transformParameterSource(input.in);
        if (!sourceIn) {
            throw new SwaggerError({
                message: `The parameter source '${input.in}' for parameter '${input.name}' is not supported in OpenAPI 2.0.`,
                code: SwaggerErrorCode.PARAMETER_SOURCE_UNSUPPORTED,
            });
        }

        const parameter = {
            description: input.description,
            in: sourceIn,
            name: input.name,
            required: input.required,
        } as ParameterV2;

        if (
            input.in !== ParameterSource.BODY &&
            isRefEnumType(input.type)
        ) {
            input.type = {
                typeName: TypeName.ENUM,
                members: input.type.members,
            };
        }

        // Swagger 2.0: formData file parameters use type: 'file' directly
        if (
            parameter.in === ParameterSourceV2.FORM_DATA &&
            input.type.typeName === TypeName.FILE
        ) {
            parameter.type = 'file' as `${DataTypeName}`;
            Object.assign(parameter, this.transformValidators(input.validators));
            return parameter;
        }

        const parameterType = this.getSchemaForType(input.type);
        if (
            parameter.in !== ParameterSourceV2.BODY &&
            parameterType.format
        ) {
            parameter.format = parameterType.format;
        }

        // collectionFormat, might be valid for all parameters (if value != multi)
        if (
            (parameter.in === ParameterSourceV2.FORM_DATA || parameter.in === ParameterSourceV2.QUERY) &&
            (input.type.typeName === TypeName.ARRAY || parameterType.type === DataTypeName.ARRAY)
        ) {
            parameter.collectionFormat = input.collectionFormat || this.config.collectionFormat || 'multi';
        }

        if (parameter.in === ParameterSourceV2.BODY) {
            if ((input.type.typeName === TypeName.ARRAY || parameterType.type === DataTypeName.ARRAY)) {
                parameter.schema = {
                    items: parameterType.items,
                    type: DataTypeName.ARRAY,
                };
            } else if (input.type.typeName === TypeName.ANY) {
                parameter.schema = { type: DataTypeName.OBJECT };
            } else {
                parameter.schema = parameterType;
            }

            parameter.schema = {
                ...parameter.schema,
                ...this.transformValidators(input.validators),
            };

            return parameter;
        }

        // todo: this is eventually illegal
        Object.assign(parameter, this.transformValidators(input.validators));

        if (input.type.typeName === TypeName.ANY) {
            parameter.type = DataTypeName.STRING;
        } else if (parameterType.type && !Array.isArray(parameterType.type)) {
            parameter.type = parameterType.type;
        }

        if (parameterType.items) {
            parameter.items = parameterType.items;
        }
        if (parameterType.enum) {
            parameter.enum = parameterType.enum;
        }

        if (typeof input.default !== 'undefined') {
            parameter.default = input.default;
        }

        return parameter;
    }

    private buildMethodConsumes(method: Method) : string[] {
        if (
            method.consumes &&
            method.consumes.length > 0
        ) {
            return method.consumes;
        }

        if (this.hasFileParams(method)) {
            return ['multipart/form-data'];
        }

        if (this.hasFormParams(method)) {
            return ['application/x-www-form-urlencoded'];
        }

        if (this.supportsBodyParameters(method.method)) {
            return ['application/json'];
        }

        return [];
    }

    private hasFileParams(method: Method) {
        return method.parameters.some((p) => (p.in === ParameterSource.FORM_DATA && p.type.typeName === 'file'));
    }

    private hasFormParams(method: Method) {
        return method.parameters.some((p) => (p.in === ParameterSource.FORM_DATA));
    }

    private supportsBodyParameters(method: string) {
        return ['post', 'put', 'patch'].includes(method);
    }

    /*
        Swagger Type ( + utils)
     */

    protected applyNullable(schema: SchemaV2, nullable: boolean): void {
        schema['x-nullable'] = nullable;
    }

    protected getRefPrefix(): string {
        return '#/definitions/';
    }

    protected getSchemaForIntersectionType(type: IntersectionType) : SchemaV2 {
        // tslint:disable-next-line:no-shadowed-variable
        const properties = type.members.reduce((acc, type) => {
            if (isRefObjectType(type)) {
                const refType = this.metadata.referenceTypes[type.refName] as RefObjectType;

                const props = refType &&
                    refType.properties &&
                    refType.properties.reduce((pAcc, prop) => ({
                        ...pAcc,
                        [prop.name]: this.getSchemaForType(prop.type),
                    }), {});
                return { ...acc, ...props };
            }
            return { ...acc };
        }, {});

        return { type: DataTypeName.OBJECT, properties };
    }


    protected getSchemaForUnionType(type: UnionType) : SchemaV2 {
        const members : Type[] = [];

        const enumTypeMember : EnumType = { typeName: TypeName.ENUM, members: [] };
        for (let i = 0; i < type.members.length; i++) {
            const member = type.members[i];
            if (isEnumType(member)) {
                enumTypeMember.members.push(...member.members);
            }

            if (
                !isAnyType(member) &&
                !isUndefinedType(member) &&
                !isNeverType(member) &&
                !isEnumType(member)
            ) {
                members.push(member);
            }
        }

        if (
            members.length === 0 &&
            enumTypeMember.members.length > 0
        ) {
            return this.getSchemaForEnumType(enumTypeMember);
        }

        const isNullEnum = enumTypeMember.members.every((member) => member === null);
        if (members.length === 1) {
            if (isNullEnum) {
                const memberType = this.getSchemaForType(members[0]);
                if (memberType.$ref) {
                    return memberType;
                }

                memberType['x-nullable'] = true;
                return memberType;
            }

            if (enumTypeMember.members.length === 0) {
                return this.getSchemaForType(members[0]);
            }
        }

        return { type: DataTypeName.OBJECT, ...(isNullEnum ? { 'x-nullable': true } : {}) };
    }

    private buildOperation(method: Method) {
        const operation : OperationV2 = {
            operationId: this.getOperationId(method.name),
            consumes: method.consumes || [],
            produces: method.produces || [],
            responses: {},
            security: method.security || [],
        };

        const produces : string[] = [];

        method.responses.forEach((res: Response) => {
            operation.responses[res.status] = { description: res.description };

            if (
                res.schema &&
                !isVoidType(res.schema) &&
                !isNeverType(res.schema)
            ) {
                if (res.produces) {
                    produces.push(...res.produces);
                } else if (isBinaryType(res.schema)) {
                    produces.push('application/octet-stream');
                }

                operation.responses[res.status].schema = this.getSchemaForType(res.schema);
            }

            if (
                res.examples &&
                res.examples.length > 0
            ) {
                const example = res.examples[0];
                if (example.value) {
                    operation.responses[res.status].examples = { 'application/json': example.value };
                }
            }
        });

        if (operation.consumes.length === 0) {
            const hasBody = method.parameters
                .some((parameter) => parameter.in === ParameterSource.BODY || parameter.in === ParameterSource.BODY_PROP);
            if (hasBody) {
                operation.consumes.push('application/json');
            }

            const hasFormData = method.parameters
                .some((parameter) => parameter.in === ParameterSource.FORM_DATA);
            if (hasFormData) {
                operation.consumes.push('multipart/form-data');
            }
        }

        if (
            operation.produces.length === 0 &&
            produces.length > 0
        ) {
            operation.produces = [...new Set(produces)];
        }

        if (operation.produces.length === 0) {
            operation.produces = ['application/json'];
        }

        return operation;
    }
}
