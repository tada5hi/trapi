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
    isRefAliasType,
    isRefEnumType,
    isRefObjectType,
} from '@trapi/metadata';
import { merge } from 'smob';
import path from 'node:path';
import { URL } from 'node:url';
import type { SecurityDefinition, SecurityDefinitions } from '../../type';

import { hasOwnProperty, normalizePathParameters } from '../../utils';

import type {
    DataFormat, Example, Path, SpecificationParameter,
} from '../type';
import type { SpecificationV2 } from './type';
import { AbstractSpecGenerator } from '../abstract';

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
            swagger: '2.0.0',
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
                pathObject[method.method] = this.buildPathMethod(controller.name, method);
            });
        });

        return paths;
    }

    private buildPathMethod(controllerName: string, method: Method) {
        const pathMethod: any = this.buildOperation(method);
        pathMethod.description = method.description;
        if (method.summary) {
            pathMethod.summary = method.summary;
        }

        if (method.deprecated) { pathMethod.deprecated = method.deprecated; }
        if (method.tags.length) { pathMethod.tags = method.tags; }
        if (method.security) {
            pathMethod.security = method.security.map((s) => ({
                [s.name]: s.scopes || [],
            }));
        }

        this.handleMethodConsumes(method, pathMethod);

        pathMethod.parameters = method.parameters
            .filter((p) => (p.in !== 'param'))
            .map((p) => this.buildParameter(p));

        method.parameters
            .filter((p) => (p.in === 'param'))
            .forEach((p) => {
                pathMethod.parameters.push(this.buildParameter({
                    description: p.description,
                    in: 'query',
                    name: p.name,
                    parameterName: p.parameterName,
                    required: false,
                    type: p.type,
                }));
                pathMethod.parameters.push(this.buildParameter({
                    description: p.description,
                    in: 'formData',
                    name: p.name,
                    parameterName: p.parameterName,
                    required: false,
                    type: p.type,
                }));
            });

        if (pathMethod.parameters.filter((p) => p.in === 'body').length > 1) {
            throw new Error('Only one body parameter allowed per controller method.');
        }
        return pathMethod;
    }

    private buildParameter(parameter: Parameter): SpecificationParameter<SpecificationV2.SchemaV2> {
        const swaggerParameter: any = {
            description: parameter.description,
            in: parameter.in,
            name: parameter.name,
            required: parameter.required,
        };

        const parameterType = this.getSwaggerType(parameter.type);
        if ((hasOwnProperty(parameterType, '$ref') && parameterType.$ref) || parameter.in === 'body') {
            swaggerParameter.schema = parameterType;
        } else {
            swaggerParameter.type = parameterType.type;

            if (parameterType.items) {
                swaggerParameter.items = parameterType.items;

                if (parameter.collectionFormat || this.config.collectionFormat) {
                    swaggerParameter.collectionFormat = parameter.collectionFormat || this.config.collectionFormat;
                }
            }
        }

        if (parameterType.format) { swaggerParameter.format = parameterType.format; }

        if (parameter.default !== undefined) { swaggerParameter.default = parameter.default; }

        if (parameterType.enum) { swaggerParameter.enum = parameterType.enum; }

        return swaggerParameter;
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

        if (types.size === 1) {
            const type = types.values().next().value;
            const nullable = !!enumType.members.includes(null);
            return { type, enum: enumType.members.map((member: string | number | boolean | null) => (member === null ? null : String(member))), 'x-nullable': nullable };
        }
        const valuesDelimited = Array.from(types).join(',');
        throw new Error(`Enums can only have string or number values, but enum had ${valuesDelimited}`);
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
        const operation: any = {
            operationId: this.getOperationId(method.name),
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
            if (res.examples) {
                operation.responses[res.status].examples = { 'application/json': res.examples };
            }
        });
        this.handleMethodProduces(method, operation, methodReturnTypes);
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

    private handleMethodProduces(method: Method, operation: any, methodReturnTypes: Set<string>) {
        if (method.produces.length) {
            operation.produces = method.produces;
        } else if (methodReturnTypes && methodReturnTypes.size > 0) {
            operation.produces = Array.from(methodReturnTypes);
        }
    }
}
