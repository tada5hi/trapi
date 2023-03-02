/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EnumType,
    IntersectionType, ReferenceType, ResolverProperty, TypeVariant,
} from '@trapi/decorators';
import { isVoidType } from '@trapi/decorators';
import { URL } from 'url';
import type {
    Method, Parameter, Response,
} from '@trapi/metadata';
import { merge } from 'smob';
import { hasOwnProperty, normalizePathParameters } from '../../utils';
import type { Specification } from '../type';
import type { SpecificationV3 } from './type';
import { removeFinalCharacter, removeRepeatingCharacter } from '../utils';
import { AbstractSpecGenerator } from '../abstract';

export class Version3SpecGenerator extends AbstractSpecGenerator<SpecificationV3.Spec, SpecificationV3.Schema> {
    public getSwaggerSpec(): SpecificationV3.Spec {
        return this.build();
    }

    public build() : SpecificationV3.Spec {
        if (typeof this.spec !== 'undefined') {
            return this.spec;
        }

        let spec: SpecificationV3.Spec = {
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
            components.securitySchemes = Version3SpecGenerator.translateSecurityDefinitions(this.config.securityDefinitions);
        }

        return components;
    }

    private static translateSecurityDefinitions(
        securityDefinitions: Specification.SecurityDefinitions,
    ) : Record<string, SpecificationV3.Security> {
        const security : Record<string, SpecificationV3.Security> = {};

        // tslint:disable-next-line:forin
        const keys = Object.keys(securityDefinitions);
        for (let i = 0; i < keys.length; i++) {
            const securityDefinition : Specification.SecurityDefinition = securityDefinitions[keys[i]];

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
        const paths: { [pathName: string]: Specification.Path<SpecificationV3.Operation, SpecificationV3.Parameter> } = {};

        this.metadata.controllers.forEach((controller) => {
            // construct documentation using all methods except @Hidden
            controller.methods
                .filter((method) => !method.hidden)
                .forEach((method) => {
                    let path = removeFinalCharacter(
                        removeRepeatingCharacter(`/${controller.path}/${method.path}`, '/'),
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
        const operation = this.buildOperation(controllerName, method);
        if (typeof pathObject === 'object') {
            pathObject[method.method] = operation;
        }

        const pathMethod: SpecificationV3.Operation = operation;
        pathMethod.description = method.description;
        pathMethod.summary = method.summary;
        pathMethod.tags = method.tags;

        // Use operationId tag otherwise fallback to generated. Warning: This doesn't check uniqueness.
        pathMethod.operationId = method.operationId || pathMethod.operationId;

        if (method.deprecated) {
            pathMethod.deprecated = method.deprecated;
        }

        if (method.security) {
            pathMethod.security = method.security as any[];
        }

        const bodyParams = method.parameters.filter((p) => p.in === 'body');
        const formParams = method.parameters.filter((p) => p.in === 'formData');

        pathMethod.parameters = method.parameters
            .filter((p) => ['body', 'formData', 'request', 'body-prop', 'res'].indexOf(p.in) === -1)
            .map((p) => this.buildParameter(p));

        if (bodyParams.length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }

        if (bodyParams.length > 0 && formParams.length > 0) {
            throw new Error('Either body parameter or form parameters allowed per controller method - not both.');
        }

        if (bodyParams.length > 0) {
            pathMethod.requestBody = this.buildRequestBody(bodyParams[0]);
        } else if (formParams.length > 0) {
            pathMethod.requestBody = this.buildRequestBodyWithFormData(formParams);
        }

        for (let i = 0; i < method.extensions.length; i++) {
            pathMethod[method.extensions[i].key] = method.extensions[i].value;
        }
    }

    private buildRequestBodyWithFormData(parameters: Parameter[]): SpecificationV3.RequestBody {
        const required: string[] = [];
        const properties: { [propertyName: string]: SpecificationV3.Schema } = {};

        const keys = Object.keys(parameters);
        for (let i = 0; i < parameters.length; i++) {
            const mediaType = this.buildMediaType(parameters[keys[i]]);
            properties[parameters[keys[i]].name] = mediaType.schema!;
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

    private buildRequestBody(parameter: Parameter): SpecificationV3.RequestBody {
        const mediaType = this.buildMediaType(parameter);

        return {
            description: parameter.description,
            required: parameter.required,
            content: {
                'application/json': mediaType,
            },
        };
    }

    private buildMediaType(parameter: Parameter): SpecificationV3.MediaType {
        const mediaType: SpecificationV3.MediaType = {
            schema: this.getSwaggerType(parameter.type),
        };

        this.buildFromParameterExamples(mediaType, parameter);

        return mediaType;
    }

    protected buildOperation(controllerName: string, method: Method): SpecificationV3.Operation {
        const swaggerResponses: { [name: string]: SpecificationV3.Response } = {};

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
                        schema: this.getSwaggerType(res.schema) as SpecificationV3.Schema,
                    } as SpecificationV3.Schema,
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
                const headers: { [name: string]: SpecificationV3.Header } = {};
                if (res.headers.typeName === 'refObject') {
                    headers[res.headers.refName] = {
                        schema: this.getSwaggerTypeForReferenceType(res.headers) as SpecificationV3.Schema,
                        description: res.headers.description,
                    };
                } else if (res.headers.typeName === 'nestedObjectLiteral') {
                    res.headers.properties.forEach((each: ResolverProperty) => {
                        headers[each.name] = {
                            schema: this.getSwaggerType(each.type) as SpecificationV3.Schema,
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

    private buildParameter(source: Parameter): SpecificationV3.Parameter {
        const parameter : SpecificationV3.Parameter = {
            description: source.description,
            in: source.in as Specification.ParameterInType,
            name: source.name,
            required: source.required,
            schema: {
                default: source.default,
                format: undefined,
            },
        };

        if (source.deprecated) {
            parameter.deprecated = true;
        }

        const parameterType = this.getSwaggerType(source.type);
        if (parameterType.format) {
            parameter.schema.format = parameterType.format;
        }

        if (
            hasOwnProperty(parameterType, '$ref') &&
            parameterType.$ref
        ) {
            parameter.schema = parameterType as SpecificationV3.Schema;
            return parameter;
        }

        if (source.type.typeName === 'any') {
            parameter.schema.type = 'string';
        } else {
            if (parameterType.type) {
                parameter.schema.type = parameterType.type as Specification.DataType;
            }
            parameter.schema.items = parameterType.items;
            parameter.schema.enum = parameterType.enum;
        }

        this.buildFromParameterExamples(parameter, source);

        return parameter;
    }

    private buildFromParameterExamples(
        parameter: SpecificationV3.Parameter | SpecificationV3.MediaType,
        sourceParameter: Parameter,
    ) {
        if (
            (Array.isArray(sourceParameter.example) && sourceParameter.example.length === 1) ||
            typeof sourceParameter.example === 'undefined'
        ) {
            parameter.example = Array.isArray(sourceParameter.example) &&
            sourceParameter.example.length === 1 ?
                sourceParameter.example[0] :
                undefined;
        } else {
            parameter.examples = {};
            sourceParameter.example.forEach((example, index) => Object.assign(parameter.examples, {
                [`Example ${index + 1}`]: { value: example } as Specification.Example,
            }));
        }
        return parameter;
    }

    private buildServers() : SpecificationV3.Server[] {
        const url = new URL(this.config.host || 'http://localhost:3000/');
        let host : string = (url.host + url.pathname).replace(/([^:]\/)\/+/g, '$1');
        host = host.substr(-1, 1) === '/' ? host.substr(0, host.length - 1) : host;

        return [
            {
                url: host,
            },
        ];
    }

    private buildSchema() {
        const schema: { [name: string]: SpecificationV3.Schema } = {};
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
                const format = referenceType.format as Specification.DataFormat;
                const validators = Object.keys(referenceType.validators)
                    .filter((key) => !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate')
                    .reduce((acc, key) => ({
                        ...acc,
                        [key]: referenceType.validators[key].value,
                    }), {});

                schema[referenceType.refName] = {
                    ...(swaggerType as SpecificationV3.Schema),
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

    protected getSwaggerTypeForIntersectionType(type: IntersectionType) : SpecificationV3.Schema {
        return { allOf: type.members.map((x: TypeVariant) => this.getSwaggerType(x)) };
    }

    protected buildProperties<T>(properties: ResolverProperty[]): Record<string, SpecificationV3.Schema> {
        const result: { [propertyName: string]: SpecificationV3.Schema } = {};

        properties.forEach((property) => {
            const swaggerType = this.getSwaggerType(property.type) as SpecificationV3.Schema;
            const format = property.format as Specification.DataFormat;
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

    protected getSwaggerTypeForEnumType(enumType: EnumType): SpecificationV3.Schema {
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

    protected getSwaggerTypeForReferenceType(referenceType: ReferenceType): SpecificationV3.Schema {
        return {
            $ref: `#/components/schemas/${referenceType.refName}`,
        };
    }
}
