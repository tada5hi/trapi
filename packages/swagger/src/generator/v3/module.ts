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
    RefAliasType, RefEnumType,
    RefObjectType,
    ReferenceType,
    ResolverProperty, Response, TypeVariant,
    UnionType,
} from '@trapi/metadata';
import {
    ParameterSource, isAnyType, isEnumType, isVoidType,
} from '@trapi/metadata';
import { URL } from 'node:url';
import { merge } from 'smob';
import type {
    DataFormat,
    DataType,
    Example,
    HeaderV3,
    MediaTypeV3,
    OperationV3,
    ParameterV3,
    Path,
    RequestBodyV3,
    ResponseV3,
    SchemaV3,
    SecurityV3,
    ServerV3,
    SpecV3,
} from '../../schema';
import { ParameterSourceV3 } from '../../schema';
import type { SecurityDefinition, SecurityDefinitions } from '../../type';
import {
    normalizePathParameters, removeDuplicateSlashes, removeFinalCharacter, transformValueTo,
} from '../../utils';
import { AbstractSpecGenerator } from '../abstract';

export class V3Generator extends AbstractSpecGenerator<SpecV3, SchemaV3> {
    async build() : Promise<SpecV3> {
        if (typeof this.spec !== 'undefined') {
            return this.spec;
        }

        let spec: SpecV3 = {
            components: this.buildComponents(),
            info: this.buildInfo(),
            openapi: '3.1.0',
            paths: this.buildPaths(),
            servers: this.buildServers(),
            tags: [],
        };

        if (this.config.specificationExtra) {
            spec = merge(spec, this.config.specificationExtra);
        }

        this.spec = spec;

        await this.save();

        return spec;
    }

    private buildComponents() {
        const components = {
            examples: {},
            headers: {},
            parameters: {},
            requestBodies: {},
            responses: {},
            schemas: this.buildSchema(),
            securitySchemes: {},
        };

        if (this.config.securityDefinitions) {
            components.securitySchemes = V3Generator.translateSecurityDefinitions(this.config.securityDefinitions);
        }

        return components;
    }

    private static translateSecurityDefinitions(
        securityDefinitions: SecurityDefinitions,
    ) : Record<string, SecurityV3> {
        const output : Record<string, SecurityV3> = {};

        const keys = Object.keys(securityDefinitions);
        for (let i = 0; i < keys.length; i++) {
            const securityDefinition : SecurityDefinition = securityDefinitions[keys[i]];

            switch (securityDefinition.type) {
                case 'http':
                    output[keys[i]] = securityDefinition;
                    break;
                case 'oauth2':
                    output[keys[i]] = securityDefinition;
                    break;
                case 'apiKey':
                    output[keys[i]] = securityDefinition;
                    break;
            }
        }

        return output;
    }

    private buildPaths() {
        const output: Record<string, Path<OperationV3, ParameterV3>> = {};

        for (let i = 0; i < this.metadata.controllers.length; i++) {
            const controller = this.metadata.controllers[i];
            for (let j = 0; j < controller.methods.length; j++) {
                const method = controller.methods[j];
                if (method.hidden) {
                    continue;
                }

                let path = removeFinalCharacter(removeDuplicateSlashes(`/${controller.path}/${method.path}`), '/');
                path = normalizePathParameters(path);

                output[path] = output[path] || {};
                output[path][method.method] = this.buildMethod(controller.name, method);
            }
        }

        return output;
    }

    private buildMethod(controllerName: string, method: Method) : OperationV3 {
        const output = this.buildOperation(controllerName, method);

        output.description = method.description;
        output.summary = method.summary;
        output.tags = method.tags;

        // Use operationId tag otherwise fallback to generate. Warning: This doesn't check uniqueness.
        output.operationId = method.operationId || output.operationId;

        if (method.deprecated) {
            output.deprecated = method.deprecated;
        }

        if (method.security) {
            output.security = method.security as any[];
        }

        const parameters = this.groupParameters(method.parameters);

        output.parameters = [
            ...(parameters[ParameterSource.QUERY_PROP] || []),
            ...(parameters[ParameterSource.HEADER] || []),
            ...(parameters[ParameterSource.PATH] || []),
            ...(parameters[ParameterSource.COOKIE] || []),
        ]
            .map((p) => this.buildParameter(p));

        // ignore ParameterSource.QUERY!

        const bodyParams = parameters[ParameterSource.BODY] || [];
        const formParams = parameters[ParameterSource.FORM_DATA] || [];

        if (bodyParams.length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }

        if (bodyParams.length > 0 && formParams.length > 0) {
            throw new Error('Either body parameter or form parameters allowed per controller method - not both.');
        }

        const bodyPropParams = parameters[ParameterSource.BODY_PROP] || [];
        if (bodyPropParams.length > 0) {
            if (bodyParams.length === 0) {
                bodyParams.push({
                    in: 'body',
                    name: 'body',
                    description: '',
                    parameterName: bodyPropParams[0].parameterName || 'body',
                    required: true,
                    type: {
                        typeName: 'nestedObjectLiteral',
                        properties: [],
                    },
                    validators: {},
                    deprecated: false,
                });
            }

            if (bodyParams[0].type.typeName === 'nestedObjectLiteral') {
                for (let i = 0; i < bodyPropParams.length; i++) {
                    bodyParams[0].type.properties.push({
                        default: bodyPropParams[i].default,
                        validators: bodyPropParams[i].validators,
                        description: bodyPropParams[i].description,
                        name: bodyPropParams[i].name,
                        type: bodyPropParams[i].type,
                        required: bodyPropParams[i].required,
                        deprecated: bodyPropParams[i].deprecated,
                    });
                }
            }
        }

        if (bodyParams.length > 0) {
            output.requestBody = this.buildRequestBody(bodyParams[0]);
        } else if (formParams.length > 0) {
            output.requestBody = this.buildRequestBodyWithFormData(formParams);
        }

        for (let i = 0; i < method.extensions.length; i++) {
            output[method.extensions[i].key] = method.extensions[i].value;
        }

        return output;
    }

    private buildRequestBodyWithFormData(parameters: Parameter[]): RequestBodyV3 {
        const required: string[] = [];
        const properties: Record<string, SchemaV3> = {};

        const keys = Object.keys(parameters);
        for (let i = 0; i < parameters.length; i++) {
            const { schema } = this.buildMediaType(parameters[keys[i]]);
            properties[parameters[keys[i]].name] = schema;

            if (parameters[keys[i]].required) {
                required.push(parameters[keys[i]].name);
            }
        }

        return {
            required: required.length > 0,
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        properties,
                        // An empty list required: [] is not valid.
                        // If all properties are optional, do not specify the required keyword.
                        ...(required && required.length && { required }),
                    },
                },
            },
        };
    }

    private buildRequestBody(parameter: Parameter): RequestBodyV3 {
        const mediaType = this.buildMediaType(parameter);

        return {
            description: parameter.description,
            required: parameter.required,
            content: {
                'application/json': mediaType,
            },
        };
    }

    private buildMediaType(parameter: Parameter): MediaTypeV3 {
        return {
            schema: this.getSwaggerType(parameter.type),
            examples: this.transformParameterExamples(parameter),
        };
    }

    protected buildResponses(input: Response[]) : Record<string, ResponseV3> {
        const output: Record<string, ResponseV3> = {};

        for (let i = 0; i < input.length; i++) {
            const res = input[i];
            const name : string = res.status || 'default';
            output[name] = {
                description: res.description,
            };

            if (res.schema && !isVoidType(res.schema)) {
                const contentKey = 'application/json';

                const examples : Record<string, Example> = {};
                if (
                    res.examples &&
                    res.examples.length > 0
                ) {
                    for (let i = 0; i < res.examples.length; i++) {
                        const label = res.examples[i].label || `example${i + 1}`;
                        examples[label] = {
                            value: res.examples[i].value,
                        };
                    }
                }

                output[name].content = output[name].content || {};
                output[name].content[contentKey] = {
                    schema: this.getSwaggerType(res.schema),
                    examples,
                };
            }

            if (res.headers) {
                const headers: { [name: string]: HeaderV3 } = {};
                if (res.headers.typeName === 'refObject') {
                    headers[res.headers.refName] = {
                        schema: this.getSwaggerTypeForReferenceType(res.headers) as SchemaV3,
                        description: res.headers.description,
                    };
                } else if (res.headers.typeName === 'nestedObjectLiteral') {
                    res.headers.properties.forEach((each: ResolverProperty) => {
                        headers[each.name] = {
                            schema: this.getSwaggerType(each.type) as SchemaV3,
                            description: each.description,
                            required: each.required,
                        };
                    });
                }

                output[res.name].headers = headers;
            }
        }

        return output;
    }

    protected buildOperation(controllerName: string, method: Method): OperationV3 {
        const operation : OperationV3 = {
            operationId: this.getOperationId(method.name),
            responses: this.buildResponses(method.responses),
        };
        if (method.description) {
            operation.description = method.description;
        }
        if (method.security) {
            operation.security = method.security;
        }
        if (method.deprecated) {
            operation.deprecated = method.deprecated;
        }

        return operation;
    }

    protected transformParameterSource(
        source: `${ParameterSource}`,
    ) : `${ParameterSourceV3}` | undefined {
        if (source === ParameterSource.COOKIE) {
            return ParameterSourceV3.COOKIE;
        }

        if (source === ParameterSource.HEADER) {
            return ParameterSourceV3.HEADER;
        }

        if (source === ParameterSource.PATH) {
            return ParameterSourceV3.PATH;
        }

        if (source === ParameterSource.QUERY_PROP || source === ParameterSource.QUERY) {
            return ParameterSourceV3.QUERY;
        }

        return undefined;
    }

    protected buildParameter(input: Parameter): ParameterV3 {
        const sourceIn = this.transformParameterSource(input.in);
        if (!sourceIn) {
            throw new Error(`The parameter source "${input.in}" is not valid for generating a document.`);
        }

        const parameter : ParameterV3 = {
            allowEmptyValue: false,
            deprecated: false,
            description: input.description,
            in: sourceIn,
            name: input.name,
            required: input.required,
            schema: {
                default: input.default,
                format: undefined,
                ...this.transformValidators(input.validators),
            },
        };

        if (input.deprecated) {
            parameter.deprecated = true;
        }

        const parameterType = this.getSwaggerType(input.type);
        if (parameterType.format) {
            parameter.schema.format = parameterType.format;
        }

        if (parameterType.$ref) {
            parameter.schema = parameterType;
            return parameter;
        }

        if (input.type.typeName === 'any') {
            parameter.schema.type = 'string';
        } else {
            if (parameterType.type) {
                parameter.schema.type = parameterType.type as DataType;
            }
            parameter.schema.items = parameterType.items;
            parameter.schema.enum = parameterType.enum;
        }

        parameter.examples = this.transformParameterExamples(input);

        return parameter;
    }

    private transformParameterExamples(parameter: Parameter) : Record<string, Example> {
        const output : Record<string, Example> = {};
        if (
            parameter.examples &&
            parameter.examples.length > 0
        ) {
            for (let i = 0; i < parameter.examples.length; i++) {
                const label = parameter.examples[i].label || `example${i + 1}`;
                output[label] = {
                    value: parameter.examples[i].value,
                };
            }
        }

        return output;
    }

    private buildServers() : ServerV3[] {
        const servers = [];
        for (let i = 0; i < this.config.servers.length; i++) {
            const url = new URL(this.config.servers[i].url, 'http://localhost:3000/');
            servers.push({
                url: `${url.protocol}//${url.host}${url.pathname || ''}`,
                ...(this.config.servers[i].description ? { description: this.config.servers[i].description } : {}),
            });
        }

        return servers;
    }

    private buildSchema() {
        const output: Record<string, SchemaV3> = {};

        const keys = Object.keys(this.metadata.referenceTypes);
        for (let i = 0; i < keys.length; i++) {
            const referenceType = this.metadata.referenceTypes[keys[i]];

            switch (referenceType.typeName) {
                case 'refAlias': {
                    output[referenceType.refName] = this.buildSchemaForRefAlias(referenceType);
                    break;
                }
                case 'refEnum': {
                    output[referenceType.refName] = this.buildSchemaForRefEnum(referenceType);
                    break;
                }
                case 'refObject': {
                    output[referenceType.refName] = this.buildSchemaForRefObject(referenceType);
                    break;
                }
            }

            if (referenceType.deprecated) {
                output[referenceType.refName].deprecated = true;
            }
        }

        return output;
    }

    protected buildSchemaForRefObject(input: RefObjectType) : SchemaV3 {
        const required = input.properties.filter((p) => p.required).map((p) => p.name);
        const schema : SchemaV3 = {
            description: input.description,
            properties: this.buildProperties(input.properties),
            required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
            type: 'object',
        };

        if (input.additionalProperties) {
            schema.additionalProperties = this.getSwaggerType(input.additionalProperties);
        }

        if (input.example) {
            schema.example = input.example;
        }

        return schema;
    }

    protected buildSchemaForRefEnum(referenceType: RefEnumType) : SchemaV3 {
        const type = this.decideEnumType(referenceType.members);
        const typesUsed = this.determineTypesUsedInEnum(referenceType.members);

        if (typesUsed.length === 1) {
            const schema: SchemaV3 = {
                description: referenceType.description,
                enum: referenceType.members,
                type,
            };

            if (
                typeof referenceType.memberNames !== undefined &&
                referenceType.members.length === referenceType.memberNames.length
            ) {
                schema['x-enum-varnames'] = referenceType.memberNames;
            }

            return schema;
        }

        const schema : SchemaV3 = {
            description: referenceType.description,
            anyOf: [],
        };

        for (let i = 0; i < typesUsed.length; i++) {
            schema.anyOf.push({
                type: typesUsed[i],
                enum: referenceType.members.filter((e) => typeof e === typesUsed[i]),
            });
        }

        return schema;
    }

    protected buildSchemaForRefAlias(referenceType: RefAliasType) : SchemaV3 {
        const swaggerType = this.getSwaggerType(referenceType.type);
        const format = referenceType.format as DataFormat;

        return {
            ...(swaggerType as SchemaV3),
            default: referenceType.default || swaggerType.default,
            example: referenceType.example,
            format: format || swaggerType.format,
            description: referenceType.description,
            ...this.transformValidators(referenceType.validators),
        };
    }

    protected buildProperties<T>(properties: ResolverProperty[]): Record<string, SchemaV3> {
        const output: Record<string, SchemaV3> = {};

        properties.forEach((property) => {
            const swaggerType = this.getSwaggerType(property.type) as SchemaV3;
            swaggerType.description = property.description;
            swaggerType.example = property.example;
            swaggerType.format = property.format as DataFormat || swaggerType.format;

            if (!swaggerType.$ref) {
                swaggerType.default = property.default;
            }

            if (property.deprecated) {
                swaggerType.deprecated = true;
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

    protected getSwaggerTypeForIntersectionType(type: IntersectionType) : SchemaV3 {
        return { allOf: type.members.map((x: TypeVariant) => this.getSwaggerType(x)) };
    }

    protected getSwaggerTypeForEnumType(enumType: EnumType): SchemaV3 {
        const type = this.decideEnumType(enumType.members);
        const nullable = !!enumType.members.includes(null);

        return {
            type,
            enum: enumType.members.map((member) => transformValueTo(type, member)),
            nullable,
        };
    }

    protected getSwaggerTypeForReferenceType(referenceType: ReferenceType): SchemaV3 {
        return {
            $ref: `#/components/schemas/${referenceType.refName}`,
        };
    }

    protected getSwaggerTypeForUnionType(type: UnionType) : SchemaV3 {
        const members : TypeVariant[] = [];

        let nullable = false;
        const enumMembers : Record<string, Array<string | number | boolean>> = {};
        for (let i = 0; i < type.members.length; i++) {
            const member = type.members[i];
            if (isEnumType(member)) {
                for (let j = 0; j < member.members.length; j++) {
                    const memberChild = member.members[j];
                    if (memberChild === null || memberChild === undefined) {
                        nullable = true;
                        continue;
                    }

                    const typeOf = typeof memberChild;
                    if (typeOf === 'string' || typeOf === 'number' || typeOf === 'boolean') {
                        enumMembers[typeOf] = enumMembers[typeOf] || [];
                        enumMembers[typeOf].push(memberChild);
                    }
                }
            }

            if (!isAnyType(member) && !isEnumType(member)) {
                members.push(member);
            }
        }

        const schemas : SchemaV3[] = [];
        for (let i = 0; i < members.length; i++) {
            schemas.push(this.getSwaggerType(members[i]));
        }

        const enumMembersKeys = Object.keys(enumMembers);
        for (let i = 0; i < enumMembersKeys.length; i++) {
            const enumType : EnumType = {
                typeName: 'enum',
                members: enumMembers[enumMembersKeys[i]],
            };
            schemas.push(this.getSwaggerTypeForEnumType(enumType));
        }

        if (schemas.length === 1) {
            const schema = schemas[0];

            if (schema.$ref) {
                return { allOf: [schema], nullable };
            }

            return { ...schema, nullable };
        }

        return { anyOf: schemas, ...(nullable ? { nullable } : {}) };
    }
}
