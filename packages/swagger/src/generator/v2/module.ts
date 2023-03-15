/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EnumType,
    IntersectionType,
    Method,
    Parameter,
    RefAliasType,
    RefEnumType,
    RefObjectType,
    ReferenceType,
    ResolverProperty, Response,
    Type,
    UnionType,
} from '@trapi/metadata';
import {
    ParameterSource, TypeName, isAnyType, isEnumType, isRefEnumType,
    isRefObjectType,
} from '@trapi/metadata';
import path from 'node:path';
import { URL } from 'node:url';
import { merge } from 'smob';
import type { SecurityDefinitions } from '../../type';

import { hasOwnProperty, normalizePathParameters, transformValueTo } from '../../utils';
import { AbstractSpecGenerator } from '../abstract';

import type {
    BaseSchema,
    Example,
    OperationV2,
    ParameterV2,
    Path,
    ResponseV2,
    SchemaV2,
    SecurityV2,
    SpecV2,
} from '../../schema';
import {
    DataFormatName, DataTypeName,
    ParameterSourceV2,
} from '../../schema';

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
        for (let i = 0; i < keys.length; i++) {
            const securityDefinition = securityDefinitions[keys[i]];

            switch (securityDefinition.type) {
                case 'http':
                    if (securityDefinition.schema === 'basic') {
                        definitions[keys[i]] = {
                            type: 'basic',
                        };
                    }
                    break;
                case 'apiKey':
                    definitions[keys[i]] = securityDefinition;
                    break;
                case 'oauth2':
                    if (securityDefinition.flows.implicit) {
                        definitions[`${keys[i]}Implicit`] = {
                            type: 'oauth2',
                            flow: 'implicit',
                            authorizationUrl: securityDefinition.flows.implicit.authorizationUrl,
                            scopes: securityDefinition.flows.implicit.scopes,
                        };
                    }

                    if (securityDefinition.flows.password) {
                        definitions[`${keys[i]}Implicit`] = {
                            type: 'oauth2',
                            flow: 'password',
                            tokenUrl: securityDefinition.flows.password.tokenUrl,
                            scopes: securityDefinition.flows.password.scopes,
                        };
                    }

                    if (securityDefinition.flows.authorizationCode) {
                        definitions[`${keys[i]}AccessCode`] = {
                            type: 'oauth2',
                            flow: 'accessCode',
                            tokenUrl: securityDefinition.flows.authorizationCode.tokenUrl,
                            authorizationUrl: securityDefinition.flows.authorizationCode.authorizationUrl,
                            scopes: securityDefinition.flows.authorizationCode.scopes,
                        };
                    }

                    if (securityDefinition.flows.clientCredentials) {
                        definitions[`${keys[i]}Application`] = {
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

    protected buildSchemaForRefObject(referenceType: RefObjectType) : SchemaV2 {
        const required = referenceType.properties
            .filter((p: ResolverProperty) => p.required)
            .map((p: ResolverProperty) => p.name);

        const output : SchemaV2 = {
            description: referenceType.description,
            properties: this.buildProperties(referenceType.properties),
            required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
            type: DataTypeName.OBJECT,
        };

        if (referenceType.additionalProperties) {
            output.additionalProperties = true;
        }

        if (referenceType.example) {
            output.example = referenceType.example;
        }

        return output;
    }

    protected buildSchemaForRefEnum(referenceType: RefEnumType) : SchemaV2 {
        const output : SchemaV2 = {
            description: referenceType.description,
            enum: referenceType.members,
            type: this.decideEnumType(referenceType.members),
        };

        if (referenceType.memberNames !== undefined && referenceType.members.length === referenceType.memberNames.length) {
            output['x-enum-varnames'] = referenceType.memberNames;
        }

        return output;
    }

    protected buildSchemaForRefAlias(referenceType: RefAliasType) : SchemaV2 {
        const swaggerType = this.getSchemaForType(referenceType.type);
        const format = referenceType.format as DataFormatName;

        return {
            ...(swaggerType as SchemaV2),
            default: referenceType.default || swaggerType.default,
            example: referenceType.example as {[p: string]: Example},
            format: format || swaggerType.format,
            description: referenceType.description,
            ...this.transformValidators(referenceType.validators),
        };
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
            throw new Error('Only one body parameter allowed per controller method.');
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

            for (let i = 0; i < bodyPropParams.length; i++) {
                const bodyProp = this.getSchemaForType(bodyPropParams[i].type);
                bodyProp.default = bodyPropParams[i].default;
                bodyProp.description = bodyPropParams[i].description;
                bodyProp.example = bodyPropParams[i].examples;

                if (bodyProp.required) {
                    required.push(bodyPropParams[i].name);
                }

                schema.properties[bodyPropParams[i].name] = bodyProp;
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
                    in: 'body',
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
            throw new Error(`The parameter source "${input.in}" is not valid for generating a document.`);
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
        merge(parameter, this.transformValidators(input.validators));

        if (input.type.typeName === TypeName.ANY) {
            parameter.type = DataTypeName.STRING;
        } else if (parameterType.type) {
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
        return ['post', 'put', 'patch'].some((m) => m === method);
    }

    /*
        Swagger Type ( + utils)
     */

    protected getSchemaForEnumType(enumType: EnumType) : SchemaV2 {
        const type = this.decideEnumType(enumType.members);
        const nullable = !!enumType.members.includes(null);

        return {
            type,
            enum: enumType.members.map((member) => transformValueTo(type, member)),
            'x-nullable': nullable,
        };
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

    protected getSchemaForReferenceType(referenceType: ReferenceType): SchemaV2 {
        return { $ref: `#/definitions/${referenceType.refName}` };
    }

    protected getSchemaForUnionType(type: UnionType) : SchemaV2 {
        const members : Type[] = [];

        const enumTypeMember : EnumType = { typeName: TypeName.ENUM, members: [] };
        for (let i = 0; i < type.members.length; i++) {
            const member = type.members[i];
            if (isEnumType(member)) {
                enumTypeMember.members.push(...member.members);
            }

            if (!isAnyType(member) && !isEnumType(member)) {
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

    protected buildProperties(properties: ResolverProperty[]) : Record<string, SchemaV2> {
        const output: Record<string, SchemaV2> = {};

        properties.forEach((property) => {
            const swaggerType = this.getSchemaForType(property.type);
            swaggerType.description = property.description;
            swaggerType.example = property.example;
            swaggerType.format = property.format as DataFormatName || swaggerType.format;

            if (!hasOwnProperty(swaggerType, '$ref') || !swaggerType.$ref) {
                swaggerType.description = property.description;
            }

            if (property.deprecated) {
                swaggerType['x-deprecated'] = true;
            }

            if (property.extensions) {
                for (let i = 0; i < property.extensions.length; i++) {
                    swaggerType[property.extensions[i].key] = property.extensions[i].value;
                }
            }

            const extensions = this.transformExtensions(property.extensions);
            const validators = this.transformValidators(property.validators);
            output[property.name] = {
                ...swaggerType,
                ...validators,
                ...extensions,
            };
        });

        return output;
    }

    private buildOperation(method: Method) {
        const operation : OperationV2 = {
            operationId: this.getOperationId(method.name),
            consumes: method.consumes,
            produces: [],
            responses: {},
            security: method.security || [],
        };
        const methodReturnTypes = new Set<string>();

        method.responses.forEach((res: Response) => {
            operation.responses[res.status] = {
                description: res.description,
            };

            if (res.schema) {
                const swaggerType = this.getSchemaForType(res.schema);

                // todo: is void type really returned ?
                if (swaggerType.type !== DataTypeName.VOID) {
                    operation.responses[res.status].schema = swaggerType;
                }
                methodReturnTypes.add(this.getMimeType(swaggerType));
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

        if (method.produces.length) {
            operation.produces = method.produces;
        }

        if (methodReturnTypes && methodReturnTypes.size > 0) {
            operation.produces = Array.from(methodReturnTypes);
        }

        return operation;
    }

    private getMimeType(swaggerType: SchemaV2) {
        if (
            swaggerType.$ref ||
            swaggerType.type === DataTypeName.ARRAY ||
            swaggerType.type === DataTypeName.OBJECT
        ) {
            return 'application/json';
        }

        if (
            swaggerType.type === DataTypeName.STRING &&
            swaggerType.format === DataFormatName.BINARY
        ) {
            return 'application/octet-stream';
        }

        return 'text/html';
    }
}
