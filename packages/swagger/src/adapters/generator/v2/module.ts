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
} from '@trapi/core';
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
} from '@trapi/core';
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
import { joinPaths, normalizePathParameters } from '../../../core/utils';
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

        const firstServer = this.config.servers?.[0];
        if (firstServer) {
            const url = new URL(firstServer.url, 'http://localhost:3000/');

            spec.host = url.host;
            if (url.pathname) {
                spec.basePath = url.pathname;
            }
        }

        const tags = this.buildTags();
        if (tags.length > 0) {
            spec.tags = tags;
        }

        if (this.config.specificationExtra) {
            spec = merge(spec, this.config.specificationExtra);
        }

        this.spec = spec;

        return spec;
    }

    private static translateSecurityDefinitions(securityDefinitions: SecurityDefinitions) : Record<string, SecurityV2> {
        const definitions : Record<string, SecurityV2> = {};

        for (const [key, securityDefinition] of Object.entries(securityDefinitions)) {
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

    protected resolveAdditionalProperties(_type: BaseType): SchemaV2 | boolean {
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
        const usedOperationIds = new Set<string>();

        const unique = <T extends unknown[]>(input: T) : T => [...new Set(input)] as T;

        this.metadata.controllers.forEach((controller) => {
            if (controller.hidden) {
                return;
            }

            const controllerPaths = controller.paths.length === 0 ? [''] : controller.paths;

            controller.methods.forEach((method) => {
                if (method.hidden) {
                    return;
                }

                method.consumes = unique([...controller.consumes, ...method.consumes]);
                method.produces = unique([...controller.produces, ...method.produces]);
                method.tags = unique([...controller.tags, ...method.tags]);
                // Inherit controller security only when the method declared none of its own.
                // `[]` is truthy, so a plain `||` short-circuits and never cascades.
                if (!method.security?.length) {
                    method.security = controller.security;
                }
                // OpenAPI has no controller-level `deprecated` — cascade
                // controller deprecation to every emitted operation.
                method.deprecated = method.deprecated || controller.deprecated;
                // todo: unique for objects
                method.responses = unique([...controller.responses, ...method.responses]);

                for (const controllerPath of controllerPaths) {
                    const fullPath = normalizePathParameters(joinPaths(controllerPath, method.path));

                    const pathItem = output[fullPath] ?? (output[fullPath] = {});
                    if (pathItem[method.method]) {
                        this.warnDuplicateOperation(controller.name, method, fullPath);
                    }
                    pathItem[method.method] = this.buildMethod(method, fullPath, usedOperationIds);
                }
            });
        });

        return output;
    }

    private buildMethod(
        method: Method,
        emittedPath: string,
        usedOperationIds: Set<string>,
    ) : OperationV2 {
        const output = this.buildOperation(method);
        // `buildOperation` derives V2's body/form defaults; fall back to the verb
        // default only when it derived nothing.
        let consumes = output.consumes!;
        if (consumes.length === 0 && this.supportsBodyParameters(method.method)) {
            consumes = ['application/json'];
        }
        output.consumes = this.resolveConsumes(method, consumes);

        output.operationId = this.buildOperationId(method, emittedPath, usedOperationIds);

        output.description = method.description;
        if (method.summary) {
            output.summary = method.summary;
        }

        if (method.deprecated) { output.deprecated = method.deprecated; }
        if (method.tags.length) { output.tags = method.tags; }
        if (method.security?.length) {
            output.security = method.security;
        }

        const parameters = this.groupParameters(method.parameters);

        // Filter path-bound params not present in this specific URL template.
        const pathParams = (parameters[ParameterSource.PATH] || [])
            .filter((p) => emittedPath.includes(`{${p.name}}`));

        output.parameters = [
            ...pathParams,
            ...(parameters[ParameterSource.QUERY_PROP] || []),
            ...(parameters[ParameterSource.HEADER] || []),
            ...(parameters[ParameterSource.FORM_DATA] || []),
        ].map((p) => this.buildParameter(p));

        // A path variable need not be a decorated argument; declare the rest so
        // the operation stays valid (and callable from Swagger UI / generated clients).
        output.parameters.push(
            ...this.undeclaredPathVariables(emittedPath, pathParams).map((name) => ({
                name,
                in: ParameterSourceV2.PATH,
                required: true,
                type: DataTypeName.STRING,
            })),
        );

        // ignore ParameterSource.QUERY!

        // ------------------------------------------------------

        const bodyParameters = (parameters[ParameterSource.BODY] || []);
        if (bodyParameters.length > 1) {
            throw new SwaggerError({
                message: `Only one body parameter allowed per method, but ${bodyParameters.length} found in '${method.name}'.`,
                code: SwaggerErrorCode.BODY_PARAMETER_DUPLICATE,
            });
        }

        const bodyParameter = bodyParameters[0] ?
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

                schema.properties![bodyPropParam.name] = bodyProp;
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

        Object.assign(output, this.transformExtensions(method.extensions));

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

        Object.assign(parameter, this.transformExtensions(input.extensions));

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
        for (const member of type.members) {
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
            const single = members[0]!;
            if (isNullEnum) {
                const memberType = this.getSchemaForType(single) as SchemaV2;
                if (memberType.$ref) {
                    return memberType;
                }

                memberType['x-nullable'] = true;
                return memberType;
            }

            if (enumTypeMember.members.length === 0) {
                return this.getSchemaForType(single);
            }
        }

        return { type: DataTypeName.OBJECT, ...(isNullEnum ? { 'x-nullable': true } : {}) };
    }

    private buildOperation(method: Method) {
        const operation : OperationV2 = {
            // Copy, never alias: `[]` is truthy, so `method.consumes || []` handed
            // back the metadata's own array and the `push`es below mutated it.
            // V3 reads `method.consumes` now, so a Metadata reused across targets
            // (what the CLI does) leaked V2's multipart default into the V3 document.
            consumes: [...method.consumes],
            produces: [...method.produces],
            responses: {},
        };

        const produces : string[] = [];

        // Document-wide responses go first so a method's own response with the
        // same status overwrites them on the record below.
        [...(this.config.responses ?? []), ...method.responses].forEach((res: Response) => {
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

                operation.responses[res.status]!.schema = this.getSchemaForType(res.schema);
            }

            const example = res.examples?.[0];
            if (example?.value) {
                operation.responses[res.status]!.examples = { 'application/json': example.value };
            }
        });

        const consumes = operation.consumes!;
        if (consumes.length === 0) {
            const hasBody = method.parameters
                .some((parameter) => parameter.in === ParameterSource.BODY || parameter.in === ParameterSource.BODY_PROP);
            if (hasBody) {
                consumes.push('application/json');
            }

            const hasFormData = method.parameters
                .some((parameter) => parameter.in === ParameterSource.FORM_DATA);
            if (hasFormData) {
                consumes.push('multipart/form-data');
            }
        }

        if (
            operation.produces!.length === 0 &&
            produces.length > 0
        ) {
            operation.produces = [...new Set(produces)];
        }

        if (operation.produces!.length === 0) {
            operation.produces = ['application/json'];
        }

        return operation;
    }
}
