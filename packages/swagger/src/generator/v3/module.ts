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
    Metadata,
    Method,
    Parameter,
    RefEnumType,
    ResolverProperty,
    Response,
    Type,
    UnionType,
} from '@trapi/metadata';
import {
    ParameterSource,
    TypeName,
    isAnyType,
    isEnumType,
    isNestedObjectLiteralType,
    isRefObjectType,
    isUndefinedType,
    isVoidType,
} from '@trapi/metadata';
import { URL } from 'node:url';
import { merge } from 'smob';
import type {
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
import {
    DataTypeName,
    ParameterSourceV3,
} from '../../schema';
import type { OptionsInput } from '../../config';
import type { SecurityDefinition, SecurityDefinitions } from '../../types';
import { SwaggerError, SwaggerErrorCode } from '../../error';
import {
    normalizePathParameters,
    removeDuplicateSlashes,
    removeFinalCharacter,
} from '../../utils';
import { AbstractSpecGenerator } from '../abstract';
import type { Version } from '../../constants';

const OPENAPI_VERSION_MAP: Partial<Record<`${Version}`, string>> = {
    v3: '3.0.0',
    'v3.1': '3.1.0',
    'v3.2': '3.2.0',
};

export class V3Generator extends AbstractSpecGenerator<SpecV3, SchemaV3> {
    private readonly openApiVersion: string;

    constructor(
        metadata: Metadata,
        config: OptionsInput,
        version: `${Version}` = 'v3.2',
    ) {
        super(metadata, config);
        this.openApiVersion = OPENAPI_VERSION_MAP[version] || '3.2.0';
    }

    async build() : Promise<SpecV3> {
        if (typeof this.spec !== 'undefined') {
            return this.spec;
        }

        let spec: SpecV3 = {
            components: this.buildComponents(),
            info: this.buildInfo(),
            openapi: this.openApiVersion,
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
            schemas: this.buildSchemasForReferenceTypes((output, referenceType) => {
                if (referenceType.deprecated) {
                    output.deprecated = true;
                }
            }),
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
        for (const key of keys) {
            const securityDefinition : SecurityDefinition = securityDefinitions[key];

            switch (securityDefinition.type) {
                case 'http':
                    output[key] = securityDefinition;
                    break;
                case 'oauth2':
                    output[key] = securityDefinition;
                    break;
                case 'apiKey':
                    output[key] = securityDefinition;
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
            throw new SwaggerError({
                message: `Only one body parameter allowed per method, but ${bodyParams.length} found in '${method.name}'.`,
                code: SwaggerErrorCode.BODY_PARAMETER_DUPLICATE,
            });
        }

        if (bodyParams.length > 0 && formParams.length > 0) {
            throw new SwaggerError({
                message: `Cannot mix body and form parameters in method '${method.name}'.`,
                code: SwaggerErrorCode.BODY_FORM_CONFLICT,
            });
        }

        const bodyPropParams = parameters[ParameterSource.BODY_PROP] || [];
        if (bodyPropParams.length > 0) {
            if (bodyParams.length === 0) {
                bodyParams.push({
                    in: ParameterSource.BODY,
                    name: 'body',
                    description: '',
                    parameterName: bodyPropParams[0].parameterName || 'body',
                    required: true,
                    type: {
                        typeName: TypeName.NESTED_OBJECT_LITERAL,
                        properties: [],
                    },
                    validators: {},
                    deprecated: false,
                });
            }

            if (isNestedObjectLiteralType(bodyParams[0].type)) {
                for (const bodyPropParam of bodyPropParams) {
                    bodyParams[0].type.properties.push({
                        default: bodyPropParam.default,
                        validators: bodyPropParam.validators,
                        description: bodyPropParam.description,
                        name: bodyPropParam.name,
                        type: bodyPropParam.type,
                        required: bodyPropParam.required,
                        deprecated: bodyPropParam.deprecated,
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
                        type: DataTypeName.OBJECT,
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
            content: { 'application/json': mediaType },
        };
    }

    private buildMediaType(parameter: Parameter): MediaTypeV3 {
        const examples = this.transformParameterExamples(parameter);
        return {
            schema: this.getSchemaForType(parameter.type),
            ...(Object.keys(examples).length > 0 && { examples }),
        };
    }

    protected buildResponses(input: Response[]) : Record<string, ResponseV3> {
        const output: Record<string, ResponseV3> = {};

        for (const res of input) {
            const name : string = res.status || 'default';
            output[name] = { description: res.description };

            if (
                res.schema &&
                !isVoidType(res.schema)
            ) {
                const examples : Record<string, Example> = {};
                if (
                    res.examples &&
                    res.examples.length > 0
                ) {
                    for (let i = 0; i < res.examples.length; i++) {
                        const label = res.examples[i].label || `example${i + 1}`;
                        examples[label] = { value: res.examples[i].value };
                    }
                }

                output[name].content = output[name].content || {};

                const contentTypes = res.produces || ['application/json'];
                for (const contentType of contentTypes) {
                    output[name].content[contentType] = {
                        schema: this.getSchemaForType(res.schema),
                        ...(Object.keys(examples).length > 0 && { examples }),
                    };
                }
            }

            if (res.headers) {
                const headers: Record<string, HeaderV3> = {};
                if (isRefObjectType(res.headers)) {
                    headers[res.headers.refName] = {
                        schema: this.getSchemaForReferenceType(res.headers) as SchemaV3,
                        description: res.headers.description,
                    };
                } else if (isNestedObjectLiteralType(res.headers)) {
                    res.headers.properties.forEach((each: ResolverProperty) => {
                        headers[each.name] = {
                            schema: this.getSchemaForType(each.type) as SchemaV3,
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
            throw new SwaggerError({
                message: `The parameter source '${input.in}' for parameter '${input.name}' is not supported in OpenAPI 3.x.`,
                code: SwaggerErrorCode.PARAMETER_SOURCE_UNSUPPORTED,
            });
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

        const parameterType = this.getSchemaForType(input.type);
        if (parameterType.format) {
            parameter.schema.format = parameterType.format;
        }

        if (parameterType.$ref) {
            parameter.schema = parameterType;
            return parameter;
        }

        if (isAnyType(input.type)) {
            parameter.schema.type = DataTypeName.STRING;
        } else {
            if (parameterType.type) {
                parameter.schema.type = parameterType.type as DataTypeName;
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
                output[label] = { value: parameter.examples[i].value };
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

    protected resolveAdditionalProperties(type: BaseType): SchemaV3 {
        return this.getSchemaForType(type) as SchemaV3;
    }

    protected markPropertyDeprecated(schema: SchemaV3): void {
        schema.deprecated = true;
    }

    protected override assignPropertyDefaults(schema: SchemaV3, property: ResolverProperty): void {
        schema.default = property.default;
    }

    protected override buildSchemaForRefEnum(referenceType: RefEnumType): SchemaV3 {
        const typesUsed = this.determineTypesUsedInEnum(referenceType.members);

        // Single-type enums use the shared base implementation
        if (typesUsed.length === 1) {
            return super.buildSchemaForRefEnum(referenceType) as SchemaV3;
        }

        // Multi-type enums use anyOf with per-type sub-schemas (V3 only)
        const schema: SchemaV3 = {
            description: referenceType.description,
            anyOf: [],
        };

        for (const element of typesUsed) {
            schema.anyOf.push({
                type: element as `${DataTypeName}`,
                enum: referenceType.members.filter((e) => typeof e === element),
            });
        }

        return schema;
    }

    private isV31OrLater(): boolean {
        return !this.openApiVersion.startsWith('3.0');
    }

    protected override shouldStripRefSiblings(): boolean {
        return !this.isV31OrLater();
    }

    protected getSchemaForIntersectionType(type: IntersectionType) : SchemaV3 {
        return { allOf: type.members.map((x: Type) => this.getSchemaForType(x)) };
    }

    protected applyNullable(schema: SchemaV3, nullable: boolean): void {
        if (!nullable) {
            return;
        }

        if (this.isV31OrLater()) {
            // 3.1+: use type arrays instead of nullable keyword
            if (schema.type && !Array.isArray(schema.type)) {
                schema.type = [schema.type, 'null'];
            } else if (Array.isArray(schema.type) && !schema.type.includes('null')) {
                schema.type = [...schema.type, 'null'];
            }
        } else {
            // 3.0: use nullable keyword
            schema.nullable = true;
        }
    }

    protected getRefPrefix(): string {
        return '#/components/schemas/';
    }

    protected getSchemaForUnionType(type: UnionType) : SchemaV3 {
        const members : Type[] = [];

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

            if (
                !isAnyType(member) &&
                !isUndefinedType(member) &&
                !isEnumType(member)
            ) {
                members.push(member);
            }
        }

        const schemas : SchemaV3[] = [];
        for (const member of members) {
            schemas.push(this.getSchemaForType(member));
        }

        const enumMembersKeys = Object.keys(enumMembers);
        for (const enumMembersKey of enumMembersKeys) {
            const enumType : EnumType = {
                typeName: 'enum',
                members: enumMembers[enumMembersKey],
            };
            schemas.push(this.getSchemaForEnumType(enumType));
        }

        if (this.isV31OrLater()) {
            // 3.1+: add { type: 'null' } to anyOf for nullable unions
            if (nullable) {
                schemas.push({ type: 'null' } as unknown as SchemaV3);
            }

            if (schemas.length === 1) {
                return schemas[0];
            }

            return { anyOf: schemas };
        }

        // 3.0: use nullable keyword
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
