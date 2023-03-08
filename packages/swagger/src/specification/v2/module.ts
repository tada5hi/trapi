/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EnumType,
    IntersectionType,
    Method,
    Parameter,
    RefObjectType,
    ReferenceType,
    ResolverProperty,
    Response,
} from '@trapi/metadata';
import {
    ParameterSource, isRefAliasType, isRefEnumType, isRefObjectType,
} from '@trapi/metadata';
import path from 'node:path';
import { URL } from 'node:url';
import { merge } from 'smob';
import type { SecurityDefinition, SecurityDefinitions } from '../../type';

import { hasOwnProperty, normalizePathParameters, transformValueTo } from '../../utils';
import { AbstractSpecGenerator } from '../abstract';

import type {
    BaseSchema, DataFormat, Example, Path,
} from '../type';
import { ParameterSourceV2 } from './constants';
import type { SpecificationV2 } from './type';

export class Version2SpecGenerator extends AbstractSpecGenerator<SpecificationV2.SpecV2, SpecificationV2.SchemaV2> {
    public getSwaggerSpec(): SpecificationV2.SpecV2 {
        return this.build();
    }

    public build() : SpecificationV2.SpecV2 {
        if (typeof this.spec !== 'undefined') {
            return this.spec;
        }

        let spec: SpecificationV2.SpecV2 = {
            basePath: this.config.basePath,
            definitions: this.buildDefinitions(),
            info: this.buildInfo(),
            paths: this.buildPaths(),
            swagger: '2.0',
        };

        spec.securityDefinitions = this.config.securityDefinitions ?
            Version2SpecGenerator.translateSecurityDefinitions(this.config.securityDefinitions) :
            {};

        if (this.config.consumes) {
            spec.consumes = this.config.consumes;
        }

        if (this.config.produces) {
            spec.produces = this.config.produces;
        }

        if (this.config.host) {
            const url = new URL(this.config.host);
            let host : string = (url.host + url.pathname).replace(/([^:]\/)\/+/g, '$1');
            host = host.substr(-1, 1) === '/' ? host.substr(0, host.length - 1) : host;

            spec.host = host;
        }

        if (this.config.specificationExtra) {
            spec = merge(spec, this.config.specificationExtra);
        }

        this.spec = spec;

        return spec;
    }

    private static translateSecurityDefinitions(securityDefinitions: SecurityDefinitions) : Record<string, SpecificationV2.SecurityV2> {
        const definitions : Record<string, SpecificationV2.SecurityV2> = {};

        // tslint:disable-next-line:forin
        const keys = Object.keys(securityDefinitions);
        for (let i = 0; i < keys.length; i++) {
            const securityDefinition : SecurityDefinition = securityDefinitions[keys[i]];

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

    /*
        Definitions ( + utils)
     */

    private buildDefinitions() {
        const definitions: { [definitionsName: string]: SpecificationV2.SchemaV2 } = {};
        Object.keys(this.metadata.referenceTypes).map((typeName) => {
            const referenceType : ReferenceType = this.metadata.referenceTypes[typeName];
            // const key : string = referenceType.typeName.replace('_', '');

            if (isRefObjectType(referenceType)) {
                const required = referenceType.properties
                    .filter((p: ResolverProperty) => p.required).map((p: ResolverProperty) => p.name);

                definitions[referenceType.refName] = {
                    description: referenceType.description,
                    properties: this.buildProperties(referenceType.properties),
                    required: required && required.length > 0 ? Array.from(new Set(required)) : undefined,
                    type: 'object',
                };

                if (referenceType.additionalProperties) {
                    definitions[referenceType.refName].additionalProperties = true;
                }

                if (referenceType.example) {
                    definitions[referenceType.refName].example = referenceType.example;
                }
            } else if (isRefEnumType(referenceType)) {
                definitions[referenceType.refName] = {
                    description: referenceType.description,
                    enum: referenceType.members,
                    type: this.decideEnumType(referenceType.members, referenceType.refName),
                };

                if (referenceType.memberNames !== undefined && referenceType.members.length === referenceType.memberNames.length) {
                    definitions[referenceType.refName]['x-enum-varnames'] = referenceType.memberNames;
                }
            } else if (isRefAliasType(referenceType)) {
                const swaggerType = this.getSwaggerType(referenceType.type);
                const format = referenceType.format as DataFormat;
                const validators = Object.keys(referenceType.validators)
                    .filter((key) => !key.startsWith('is') && key !== 'minDate' && key !== 'maxDate')
                    .reduce((acc, key) => ({
                        ...acc,
                        [key]: referenceType.validators[key].value,
                    }), {});

                definitions[referenceType.refName] = {
                    ...(swaggerType as SpecificationV2.SchemaV2),
                    default: referenceType.default || swaggerType.default,
                    example: referenceType.example as {[p: string]: Example},
                    format: format || swaggerType.format,
                    description: referenceType.description,
                    ...validators,
                };
            }

            return typeName;
        });

        return definitions;
    }

    private decideEnumType(anEnum: Array<string | number>, nameOfEnum: string): 'string' | 'number' {
        const typesUsedInEnum = this.determineTypesUsedInEnum(anEnum);

        const badEnumErrorMessage = () => {
            const valuesDelimited = Array.from(typesUsedInEnum).join(',');
            return `Enums can only have string or number values, but enum ${nameOfEnum} had ${valuesDelimited}`;
        };

        let enumTypeForSwagger: 'string' | 'number' = 'string';
        if (typesUsedInEnum.has('string') && typesUsedInEnum.size === 1) {
            enumTypeForSwagger = 'string';
        } else if (typesUsedInEnum.has('number') && typesUsedInEnum.size === 1) {
            enumTypeForSwagger = 'number';
        } else if (typesUsedInEnum.size === 2 && typesUsedInEnum.has('number') && typesUsedInEnum.has('string')) {
            enumTypeForSwagger = 'string';
        } else {
            throw new Error(badEnumErrorMessage());
        }

        return enumTypeForSwagger;
    }

    /*
        Path & Parameter ( + utils)
     */

    private buildPaths() {
        const paths: { [pathName: string]: Path<SpecificationV2.OperationV2, SpecificationV2.ResponseV2> } = {};

        const unique = <T extends unknown[]>(input: T) : T => [...new Set(input)] as T;

        this.metadata.controllers.forEach((controller) => {
            controller.methods.forEach((method) => {
                let fullPath : string = path.posix.join('/', (controller.path ? controller.path : ''), method.path);
                fullPath = normalizePathParameters(fullPath);

                paths[fullPath] = paths[fullPath] || {};
                method.consumes = unique([...controller.consumes, ...method.consumes]);
                method.produces = unique([...controller.produces, ...method.produces]);
                method.tags = unique([...controller.tags, ...method.tags]);
                method.security = method.security || controller.security;
                // todo: unique for objects
                method.responses = unique([...controller.responses, ...method.responses]);
                const pathObject: any = paths[fullPath];
                pathObject[method.method] = this.buildPathMethod(method);
            });
        });

        return paths;
    }

    private buildPathMethod(method: Method) {
        const output = this.buildOperation(method);
        output.description = method.description;
        if (method.summary) {
            output.summary = method.summary;
        }

        if (method.deprecated) { output.deprecated = method.deprecated; }
        if (method.tags.length) { output.tags = method.tags; }
        if (method.security) {
            output.security = method.security.map((s) => ({
                [s.name]: s.scopes || [],
            }));
        }

        this.handleMethodConsumes(method, output);

        const parameters = this.groupParameters(method.parameters);

        output.parameters = [
            ...(parameters[ParameterSource.PATH] || []),
            ...(parameters[ParameterSource.QUERY_PROP] || []),
            ...(parameters[ParameterSource.HEADER] || []),
            ...(parameters[ParameterSource.FORM_DATA] || []),
            ...(parameters[ParameterSource.COOKIE] || []),
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
            const schema : BaseSchema<SpecificationV2.SchemaV2> = {
                type: 'object',
                title: 'Body',
                properties: {},
            };

            const required : string[] = [];

            for (let i = 0; i < bodyPropParams.length; i++) {
                const bodyProp = this.getSwaggerType(bodyPropParams[i].type);
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
                if (bodyParameter.schema.type === 'object') {
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
                const parameter : SpecificationV2.ParameterV2 = {
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

    protected buildParameter(input: Parameter): SpecificationV2.ParameterV2 {
        const sourceIn = this.transformParameterSource(input.in);
        if (!sourceIn) {
            throw new Error(`The parameter source ${input.in} is not valid for generating a document.`);
        }

        const parameter = {
            description: input.description,
            in: sourceIn,
            name: input.name,
            required: input.required,
        } as SpecificationV2.ParameterV2;

        if (
            input.in !== ParameterSource.BODY &&
            isRefEnumType(input.type)
        ) {
            input.type = {
                typeName: 'enum',
                members: input.type.members,
            };
        }

        const parameterType = this.getSwaggerType(input.type);
        if (
            parameter.in !== ParameterSourceV2.BODY &&
            parameterType.format
        ) {
            parameter.format = parameterType.format;
        }

        // collectionFormat, might be valid for all parameters (if value != multi)
        if (
            (parameter.in === ParameterSourceV2.FORM_DATA || parameter.in === ParameterSourceV2.QUERY) &&
            (input.type.typeName === 'array' || parameterType.type === 'array')
        ) {
            parameter.collectionFormat = input.collectionFormat || this.config.collectionFormat || 'multi';
        }

        if (parameter.in === ParameterSourceV2.BODY) {
            if ((input.type.typeName === 'array' || parameterType.type === 'array')) {
                parameter.schema = {
                    items: parameterType.items,
                    type: 'array',
                };
            } else if (input.type.typeName === 'any') {
                parameter.schema = { type: 'object' };
            } else {
                parameter.schema = parameterType;
            }

            return parameter;
        }

        if (input.type.typeName === 'any') {
            parameter.type = 'string';
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

    private handleMethodConsumes(method: Method, pathMethod: any) {
        if (method.consumes.length) { pathMethod.consumes = method.consumes; }

        if ((!pathMethod.consumes || !pathMethod.consumes.length)) {
            if (method.parameters.some((p) => (p.in === 'formData' && p.type.typeName === 'file'))) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('multipart/form-data');
            } else if (this.hasFormParams(method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/x-www-form-urlencoded');
            } else if (this.supportsBodyParameters(method.method)) {
                pathMethod.consumes = pathMethod.consumes || [];
                pathMethod.consumes.push('application/json');
            }
        }
    }

    private hasFormParams(method: Method) {
        return method.parameters.find((p) => (p.in === 'formData'));
    }

    private supportsBodyParameters(method: string) {
        return ['post', 'put', 'patch'].some((m) => m === method);
    }

    /*
        Swagger Type ( + utils)
     */

    protected getSwaggerTypeForEnumType(enumType: EnumType) : SpecificationV2.SchemaV2 {
        const types = this.determineTypesUsedInEnum(enumType.members);
        const type = types.size === 1 ? (types.values().next().value) : 'string';
        const nullable = !!enumType.members.includes(null);
        return {
            type,
            enum: enumType.members.map((member) => transformValueTo(type, member)),
            'x-nullable': nullable,
        };
    }

    protected getSwaggerTypeForIntersectionType(type: IntersectionType) : SpecificationV2.SchemaV2 {
        // tslint:disable-next-line:no-shadowed-variable
        const properties = type.members.reduce((acc, type) => {
            if (type.typeName === 'refObject') {
                let refType = type;
                refType = this.metadata.referenceTypes[refType.refName] as RefObjectType;

                const props = refType &&
                    refType.properties &&
                    refType.properties.reduce((pAcc, prop) => ({
                        ...pAcc,
                        [prop.name]: this.getSwaggerType(prop.type),
                    }), {});
                return { ...acc, ...props };
            }
            return { ...acc };
        }, {});

        return { type: 'object', properties };
    }

    protected getSwaggerTypeForReferenceType(referenceType: ReferenceType): SpecificationV2.SchemaV2 {
        return { $ref: `#/definitions/${referenceType.refName}` };
    }

    protected buildProperties(properties: ResolverProperty[]) : Record<string, SpecificationV2.SchemaV2> {
        const swaggerProperties: { [propertyName: string]: SpecificationV2.SchemaV2 } = {};

        properties.forEach((property) => {
            const swaggerType = this.getSwaggerType(property.type);
            if (!hasOwnProperty(swaggerType, '$ref') || !swaggerType.$ref) {
                swaggerType.description = property.description;
            }
            swaggerProperties[property.name] = swaggerType;
        });

        return swaggerProperties;
    }

    private buildOperation(method: Method) {
        const operation : SpecificationV2.OperationV2 = {
            operationId: this.getOperationId(method.name),
            consumes: method.consumes,
            produces: [],
            responses: {},
        };
        const methodReturnTypes = new Set<string>();

        method.responses.forEach((res: Response) => {
            operation.responses[res.status] = {
                description: res.description,
            };

            if (res.schema) {
                const swaggerType = this.getSwaggerType(res.schema);
                if (swaggerType.type !== 'void') {
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

    private getMimeType(swaggerType: SpecificationV2.SchemaV2) {
        if (
            swaggerType.$ref ||
            swaggerType.type === 'array' ||
            swaggerType.type === 'object'
        ) {
            return 'application/json';
        } if (
            swaggerType.type === 'string' &&
            swaggerType.format === 'binary'
        ) {
            return 'application/octet-stream';
        }
        return 'text/html';
    }
}
