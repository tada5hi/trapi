/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EnumType,
    IntersectionType,
    Method, NestedObjectLiteralType,
    Parameter,
    ReferenceType,
    ResolverProperty,
    Response,
    TypeVariant,
} from '@trapi/metadata';
import { ParameterSource, isVoidType } from '@trapi/metadata';
import { URL } from 'node:url';
import { isObject, merge } from 'smob';
import type { SecurityDefinition, SecurityDefinitions } from '../../type';
import { normalizePathParameters, removeDuplicateSlashes, removeFinalCharacter } from '../../utils';
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
import { AbstractSpecGenerator } from '../abstract';

export class V3Generator extends AbstractSpecGenerator<SpecV3, SchemaV3> {
    async build() : Promise<SpecV3> {
        if (typeof this.spec !== 'undefined') {
            return this.spec;
        }

        let spec: SpecV3 = {
            components: this.buildComponents(),
            info: this.buildInfo(),
            openapi: '3.0.0',
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
        const security : Record<string, SecurityV3> = {};

        // tslint:disable-next-line:forin
        const keys = Object.keys(securityDefinitions);
        for (let i = 0; i < keys.length; i++) {
            const securityDefinition : SecurityDefinition = securityDefinitions[keys[i]];

            switch (securityDefinition.type) {
                case 'http':
                    security[keys[i]] = securityDefinition;
                    break;
                case 'oauth2':
                    security[keys[i]] = securityDefinition;
                    break;
                case 'apiKey':
                    security[keys[i]] = securityDefinition;
                    break;
            }
        }

        return security;
    }

    private buildPaths() {
        const paths: { [pathName: string]: Path<OperationV3, ParameterV3> } = {};

        this.metadata.controllers.forEach((controller) => {
            // construct documentation using all methods except @Hidden
            controller.methods
                .filter((method) => !method.hidden)
                .forEach((method) => {
                    let path = removeFinalCharacter(
                        removeDuplicateSlashes(`/${controller.path}/${method.path}`),
                        '/',
                    );
                    path = normalizePathParameters(path);
                    paths[path] = paths[path] || {};
                    this.buildMethod(controller.name, method, paths[path]);
                });
        });

        return paths;
    }

    private buildMethod(controllerName: string, method: Method, pathObject: any) {
        const output = this.buildOperation(controllerName, method);
        if (isObject(pathObject)) {
            pathObject[method.method] = output;
        }

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
            const type : NestedObjectLiteralType = {
                typeName: 'nestedObjectLiteral',
                properties: [],
            };

            for (let i = 0; i < bodyPropParams.length; i++) {
                type.properties.push(bodyPropParams[i] as ResolverProperty);
            }

            if (!bodyParams.length) {
                bodyParams.push({
                    in: 'body',
                    name: 'body',
                    description: '',
                    parameterName: bodyPropParams[0].parameterName || 'body',
                    required: true,
                    type,
                    validators: {},
                    deprecated: false,
                });
            } else if (bodyParams[0].type.typeName === 'nestedObjectLiteral') {
                bodyParams[0].type = type;
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
        const mediaType: MediaTypeV3 = {
            schema: this.getSwaggerType(parameter.type),
        };

        this.buildFromParameterExamples(mediaType, parameter);

        return mediaType;
    }

    protected buildOperation(controllerName: string, method: Method): OperationV3 {
        const swaggerResponses: { [name: string]: ResponseV3 } = {};

        method.responses.forEach((res: Response) => {
            const name : string = res.status ?? 'default';
            // no string key
            swaggerResponses[name] = {
                description: res.description,
            };

            if (res.schema && !isVoidType(res.schema)) {
                const contentKey = 'application/json';
                swaggerResponses[name].content = {
                    [contentKey]: {
                        schema: this.getSwaggerType(res.schema) as SchemaV3,
                    } as SchemaV3,
                };

                if (res.examples) {
                    swaggerResponses[name].content[contentKey].examples = {
                        default: {
                            value: res.examples,
                        },
                    };
                }
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

                swaggerResponses[res.name].headers = headers;
            }
        });

        return {
            operationId: this.getOperationId(method.name),
            responses: swaggerResponses,
        };
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
            throw new Error(`The parameter source ${input.in} is not valid for generating a document.`);
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

        this.buildFromParameterExamples(parameter, input);

        return parameter;
    }

    private buildFromParameterExamples(
        parameter: ParameterV3 | MediaTypeV3,
        sourceParameter: Parameter,
    ) {
        if (
            (Array.isArray(sourceParameter.examples) && sourceParameter.examples.length === 1) ||
            typeof sourceParameter.examples === 'undefined'
        ) {
            parameter.example = Array.isArray(sourceParameter.examples) &&
            sourceParameter.examples.length === 1 ?
                sourceParameter.examples[0] :
                undefined;
        } else {
            parameter.examples = {};
            sourceParameter.examples.forEach((example, index) => Object.assign(parameter.examples, {
                [`Example ${index + 1}`]: { value: example } as Example,
            }));
        }
        return parameter;
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
        const schema: { [name: string]: SchemaV3 } = {};
        Object.keys(this.metadata.referenceTypes).map((typeName) => {
            const referenceType = this.metadata.referenceTypes[typeName];

            if (referenceType.typeName === 'refObject') {
                const required = referenceType.properties.filter((p) => p.required).map((p) => p.name);
                schema[referenceType.refName] = {
                    description: referenceType.description,
                    properties: this.buildProperties(referenceType.properties),
                    required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
                    type: 'object',
                };

                if (referenceType.additionalProperties) {
                    schema[referenceType.refName].additionalProperties = this.getSwaggerType(referenceType.additionalProperties);
                }

                if (referenceType.example) {
                    schema[referenceType.refName].example = referenceType.example;
                }
            } else if (referenceType.typeName === 'refEnum') {
                const enumTypes = this.determineTypesUsedInEnum(referenceType.members);

                if (enumTypes.size === 1) {
                    schema[referenceType.refName] = {
                        description: referenceType.description,
                        enum: referenceType.members,
                        type: enumTypes.has('string') ? 'string' : 'number',
                    };
                    if (referenceType.memberNames !== undefined && referenceType.members.length === referenceType.memberNames.length) {
                        schema[referenceType.refName]['x-enum-varnames'] = referenceType.memberNames;
                    }
                } else {
                    schema[referenceType.refName] = {
                        description: referenceType.description,
                        anyOf: [
                            {
                                type: 'number',
                                enum: referenceType.members.filter((e) => typeof e === 'number'),
                            },
                            {
                                type: 'string',
                                enum: referenceType.members.filter((e) => typeof e === 'string'),
                            },
                        ],
                    };
                }
            } else if (referenceType.typeName === 'refAlias') {
                const swaggerType = this.getSwaggerType(referenceType.type);
                const format = referenceType.format as DataFormat;
                const validators = Object.keys(referenceType.validators)
                    .filter((key) => !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate')
                    .reduce((acc, key) => ({
                        ...acc,
                        [key]: referenceType.validators[key].value,
                    }), {});

                schema[referenceType.refName] = {
                    ...(swaggerType as SchemaV3),
                    default: referenceType.default || swaggerType.default,
                    example: referenceType.example,
                    format: format || swaggerType.format,
                    description: referenceType.description,
                    ...validators,
                };
            }

            if (referenceType.deprecated) {
                schema[referenceType.refName].deprecated = true;
            }

            return typeName;
        });

        return schema;
    }

    protected getSwaggerTypeForIntersectionType(type: IntersectionType) : SchemaV3 {
        return { allOf: type.members.map((x: TypeVariant) => this.getSwaggerType(x)) };
    }

    protected buildProperties<T>(properties: ResolverProperty[]): Record<string, SchemaV3> {
        const result: { [propertyName: string]: SchemaV3 } = {};

        properties.forEach((property) => {
            const swaggerType = this.getSwaggerType(property.type) as SchemaV3;
            const format = property.format as DataFormat;
            swaggerType.description = property.description;
            swaggerType.example = property.example;
            swaggerType.format = format || swaggerType.format;

            if (!swaggerType.$ref) {
                swaggerType.default = property.default;
            }

            if (property.deprecated) {
                swaggerType.deprecated = true;
            }

            result[property.name] = swaggerType;
        });

        return result;
    }

    protected getSwaggerTypeForEnumType(enumType: EnumType): SchemaV3 {
        const types = this.determineTypesUsedInEnum(enumType.members);

        if (types.size === 1) {
            const type = types.values().next().value;
            const nullable = !!enumType.members.includes(null);

            return {
                type,
                enum: enumType.members.map((member) => (member === null ? null : String(member))),
                nullable,
            };
        }
        const valuesDelimited = Array.from(types).join(',');
        throw new Error(`Enums can only have string or number values, but enum had ${valuesDelimited}`);
    }

    protected getSwaggerTypeForReferenceType(referenceType: ReferenceType): SchemaV3 {
        return {
            $ref: `#/components/schemas/${referenceType.refName}`,
        };
    }
}
