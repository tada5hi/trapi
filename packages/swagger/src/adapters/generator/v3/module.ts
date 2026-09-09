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
    NestedObjectLiteralType,
    Parameter,
    RefAliasType,
    RefEnumType,
    RefObjectType,
    ResolverProperty,
    Response,
    Type, 
    UnionType, 
} from '@trapi/core';
import {
    ParameterSource,
    TypeName,
    isAnyType,
    isEnumType,
    isIntersectionType,
    isNestedObjectLiteralType,
    isNeverType,
    isObjectType,
    isRefAliasType,
    isRefObjectType,
    isUndefinedType,
    isVoidType,
} from '@trapi/core';
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
} from '../../../core/schema';
import {
    DataTypeName,
    ParameterSourceV3,
} from '../../../core/schema';
import type { SpecGeneratorOptionsInput } from '../../../core/config';
import type { SecurityDefinitions } from '../../../core/types';
import { SwaggerError, SwaggerErrorCode } from '../../../core/error';
import {
    joinPaths,
    normalizePathParameters,
} from '../../../core/utils';
import { AbstractSpecGenerator } from '../abstract';
import type { Version } from '../../../core/constants';

const OPENAPI_VERSION_MAP: Partial<Record<`${Version}`, string>> = {
    v3: '3.0.0',
    'v3.1': '3.1.0',
    'v3.2': '3.2.0',
};

export class V3Generator extends AbstractSpecGenerator<SpecV3, SchemaV3> {
    private readonly openApiVersion: string;

    constructor(
        metadata: Metadata,
        config: SpecGeneratorOptionsInput,
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
        };

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

        for (const [key, securityDefinition] of Object.entries(securityDefinitions)) {
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
        const usedOperationIds = new Set<string>();

        for (const controller of this.metadata.controllers) {
            if (controller.hidden) {
                continue;
            }

            const controllerPaths = controller.paths.length === 0 ? [''] : controller.paths;

            for (const method of controller.methods) {
                if (method.hidden) {
                    continue;
                }

                // OpenAPI has no controller-level `deprecated` — cascade
                // controller deprecation to every emitted operation.
                method.deprecated = method.deprecated || controller.deprecated || false;

                // Inherit controller security only when the method declared none of its own.
                // OpenAPI 3.x: an operation's `security: []` explicitly removes any inherited
                // requirement, so we must omit the field when the method has no security
                // rather than emitting an empty array.
                if (!method.security?.length) {
                    method.security = controller.security;
                }

                method.consumes = [...new Set([...controller.consumes, ...method.consumes])];
                method.produces = [...new Set([...controller.produces, ...method.produces])];
                method.tags = [...new Set([...controller.tags, ...method.tags])];
                // todo: unique for objects
                method.responses = [...new Set([...controller.responses, ...method.responses])];

                for (const controllerPath of controllerPaths) {
                    const path = normalizePathParameters(joinPaths(controllerPath, method.path));

                    const pathItem = output[path] ?? (output[path] = {});
                    if (pathItem[method.method]) {
                        this.warnDuplicateOperation(controller.name, method, path);
                    }
                    pathItem[method.method] = this.buildMethod(controller.name, method, path, usedOperationIds);
                }
            }
        }

        return output;
    }

    private buildMethod(
        controllerName: string,
        method: Method,
        emittedPath: string,
        usedOperationIds: Set<string>,
    ) : OperationV3 {
        const output = this.buildOperation(controllerName, method);

        output.description = method.description;
        output.summary = method.summary;
        if (method.tags.length) {
            output.tags = method.tags;
        }

        output.operationId = this.buildOperationId(method, emittedPath, usedOperationIds);

        if (method.deprecated) {
            output.deprecated = method.deprecated;
        }

        if (method.security?.length) {
            output.security = method.security as any[];
        }

        const parameters = this.groupParameters(method.parameters);

        // Path parameters declared on the method may not all appear in every
        // controller mount (e.g. /roles vs /realms/:id/roles). Only emit
        // path-bound params that are present in `emittedPath`.
        const pathParams = (parameters[ParameterSource.PATH] || [])
            .filter((p) => emittedPath.includes(`{${p.name}}`));

        output.parameters = [
            ...(parameters[ParameterSource.QUERY_PROP] || []),
            ...(parameters[ParameterSource.HEADER] || []),
            ...pathParams,
            ...(parameters[ParameterSource.COOKIE] || []),
        ]
            .map((p) => this.buildParameter(p));

        // A path variable need not be a decorated argument; declare the rest so
        // the operation stays valid (and callable from Swagger UI / generated clients).
        output.parameters.push(
            ...this.undeclaredPathVariables(emittedPath, pathParams).map((name) => {
                const description = this.pathParameterDescription(name);

                return {
                    name,
                    in: ParameterSourceV3.PATH,
                    required: true,
                    schema: { type: DataTypeName.STRING },
                    ...(description ? { description } : {}),
                };
            }),
        );

        // ignore ParameterSource.QUERY!

        const bodyParams = parameters[ParameterSource.BODY] || [];
        const formParams = parameters[ParameterSource.FORM_DATA] || [];
        const bodyPropParams = parameters[ParameterSource.BODY_PROP] || [];

        if (bodyParams.length > 1) {
            throw new SwaggerError({
                message: `Only one body parameter allowed per method, but ${bodyParams.length} found in '${method.name}'.`,
                code: SwaggerErrorCode.BODY_PARAMETER_DUPLICATE,
            });
        }

        // bodyProp counts here because the block below synthesizes a body from it,
        // which made `firstBodyParam` truthy and sent emission down the
        // `buildRequestBody` arm — silently discarding every form/file parameter.
        if ((bodyParams.length > 0 || bodyPropParams.length > 0) && formParams.length > 0) {
            throw new SwaggerError({
                message: `Cannot mix body and form parameters in method '${method.name}'.`,
                code: SwaggerErrorCode.BODY_FORM_CONFLICT,
            });
        }

        const firstBodyProp = bodyPropParams[0];
        if (firstBodyProp) {
            if (bodyParams.length === 0) {
                bodyParams.push({
                    in: ParameterSource.BODY,
                    name: 'body',
                    description: '',
                    parameterName: firstBodyProp.parameterName || 'body',
                    required: true,
                    type: {
                        typeName: TypeName.NESTED_OBJECT_LITERAL,
                        properties: [],
                    },
                    validators: {},
                    deprecated: false,
                    extensions: [],
                });
            }

            const firstBody = bodyParams[0]!;
            const bodyPropObjectType : NestedObjectLiteralType = {
                typeName: TypeName.NESTED_OBJECT_LITERAL,
                properties: bodyPropParams.map((bodyPropParam) => ({
                    default: bodyPropParam.default,
                    validators: bodyPropParam.validators,
                    description: bodyPropParam.description,
                    name: bodyPropParam.name,
                    type: bodyPropParam.type,
                    required: bodyPropParam.required,
                    deprecated: bodyPropParam.deprecated ?? false,
                })),
            };

            if (isNestedObjectLiteralType(firstBody.type)) {
                // Merge into a copy, never into the metadata's own nested literal.
                // `buildOperation` runs once per (controllerPath × methodPath) and a
                // `Metadata` is reused across emitted documents, so pushing in place
                // appended the same properties again on every pass — `required`
                // came out as ["name", "name"] on a controller's second mount.
                bodyParams[0] = {
                    ...firstBody,
                    type: {
                        ...firstBody.type,
                        properties: [
                            ...firstBody.type.properties,
                            ...bodyPropObjectType.properties,
                        ],
                    },
                };
            } else if (!this.isBodyMergeableType(firstBody.type)) {
                // A scalar/array/union/enum/tuple body (or an alias over one, a
                // cyclic alias included) has no object shape the properties could
                // join. Composing anyway would emit
                // `allOf: [{type: 'string'}, {type: 'object', ...}]` — schema-valid but
                // unsatisfiable by any JSON value, so every request would fail
                // validation with nothing in the document explaining why. Reject the
                // combination instead, exactly as `@BodyProp` beside a form parameter
                // is rejected above (#921/#922) for the same reason: no coherent single
                // representation exists. V2 raises the same code for the same input.
                throw new SwaggerError({
                    message: `Cannot mix a non-object body type with body properties in method '${method.name}'.`,
                    code: SwaggerErrorCode.BODY_PROP_TYPE_CONFLICT,
                });
            } else {
                // Object-like but not an inline shape whose properties can be spliced —
                // a named `refObject`/`refAlias`, or an intersection. Compose the
                // declared body type with the `@BodyProp` properties the way an
                // ordinary intersection type is composed, rather than dropping either
                // half (#923). The synthesized node's own `typeName` is `'intersection'`,
                // and every branch `getSchemaForType` checks before it tests a concrete
                // `typeName` (`isReferenceType` included), so none of them match it and
                // it renders through the existing `getSchemaForIntersectionType` —
                // `allOf` of whatever the two members emit, no new schema-building code
                // and no per-typeName special casing here.
                bodyParams[0] = {
                    ...firstBody,
                    type: {
                        typeName: TypeName.INTERSECTION,
                        members: [firstBody.type, bodyPropObjectType],
                    },
                };
            }
        }

        const firstBodyParam = bodyParams[0];
        if (firstBodyParam || formParams.length > 0) {
            const consumes = this.resolveConsumes(
                method,
                this.config.consumes?.length ? this.config.consumes : ['application/json'],
            );

            if (firstBodyParam) {
                output.requestBody = this.buildRequestBody(firstBodyParam, consumes);
            } else {
                output.requestBody = this.buildRequestBodyWithFormData(formParams, consumes);
            }
        }

        Object.assign(output, this.transformExtensions(method.extensions));

        return output;
    }

    private buildRequestBodyWithFormData(parameters: Parameter[], consumes: string[]): RequestBodyV3 {
        const required: string[] = [];
        const properties: Record<string, SchemaV3> = {};

        for (const parameter of parameters) {
            properties[parameter.name] = this.buildMediaType(parameter).schema!;

            if (parameter.required) {
                required.push(parameter.name);
            }
        }

        const schema : SchemaV3 = {
            type: DataTypeName.OBJECT,
            properties,
            // An empty list required: [] is not valid.
            // If all properties are optional, do not specify the required keyword.
            ...(required && required.length && { required }),
        };

        const content: Record<string, MediaTypeV3> = {};
        for (const contentType of consumes) {
            content[contentType] = { schema };
        }

        return {
            required: required.length > 0,
            content,
        };
    }

    private buildRequestBody(parameter: Parameter, consumes: string[]): RequestBodyV3 {
        const content: Record<string, MediaTypeV3> = {};
        for (const contentType of consumes) {
            content[contentType] = this.buildMediaType(parameter);
        }

        return {
            description: parameter.description,
            required: parameter.required,
            content,
        };
    }

    private buildMediaType(parameter: Parameter): MediaTypeV3 {
        const examples = this.transformParameterExamples(parameter);
        return {
            schema: this.getSchemaForType(parameter.type),
            ...(Object.keys(examples).length > 0 && { examples }),
        };
    }

    protected buildResponses(input: Response[], produces: string[]) : Record<string, ResponseV3> {
        const output: Record<string, ResponseV3> = {};

        for (const res of input) {
            const name : string = res.status || 'default';
            const response: ResponseV3 = { description: res.description };
            output[name] = response;

            if (
                res.schema &&
                !isVoidType(res.schema) &&
                !isNeverType(res.schema)
            ) {
                const examples : Record<string, Example> = {};
                if (res.examples) {
                    for (const [i, ex] of res.examples.entries()) {
                        const label = ex.label || `example${i + 1}`;
                        examples[label] = { value: ex.value };
                    }
                }

                const content = response.content ?? (response.content = {});

                const contentTypes = res.produces?.length ? res.produces : produces;
                for (const contentType of contentTypes) {
                    content[contentType] = {
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

                response.headers = headers;
            }
        }

        return output;
    }

    protected buildOperation(_controllerName: string, method: Method): OperationV3 {
        // Document-wide responses go first: `buildResponses` keys its output by
        // status, so a method's own response overwrites a colliding document
        // one rather than the other way round.
        const operation : OperationV3 = {
            responses: this.buildResponses(
                [...(this.config.responses ?? []), ...method.responses],
                this.resolveProduces(method),
            ),
        };
        if (method.description) {
            operation.description = method.description;
        }
        if (method.security?.length) {
            operation.security = method.security;
        }
        if (method.deprecated) {
            operation.deprecated = method.deprecated;
        }

        return operation;
    }

    /**
     * V3-only: `content` is per response, so the method produces is just the
     * fallback for responses that declare none. V2 resolves produces the other
     * way round (per operation, method wins over response).
     */
    private resolveProduces(method: Method) : string[] {
        if (method.produces && method.produces.length > 0) {
            return method.produces;
        }

        if (this.config.produces?.length) {
            return this.config.produces;
        }

        return ['application/json'];
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
            deprecated: false,
            description: input.in === ParameterSource.PATH ?
                this.pathParameterDescription(input.name, input.description) :
                input.description,
            in: sourceIn,
            name: input.name,
            required: input.required,
            schema: {
                default: input.default,
                format: undefined,
                ...this.transformValidators(input.validators),
            },
        };

        // `allowEmptyValue` is defined only for query parameters (OAS 3.1 §4.8.11.1);
        // the Parameter Object closes every other `in` branch with
        // `unevaluatedProperties: false`, so emitting it elsewhere fails validation.
        if (sourceIn === ParameterSourceV3.QUERY) {
            parameter.allowEmptyValue = input.allowEmptyValue ?? false;
        }

        Object.assign(parameter, this.transformExtensions(input.extensions));

        if (input.deprecated) {
            parameter.deprecated = true;
        }

        const parameterType = this.getSchemaForType(input.type);
        const schema = parameter.schema!;
        if (parameterType.format) {
            schema.format = parameterType.format;
        }

        if (parameterType.$ref) {
            parameter.schema = parameterType;
            return parameter;
        }

        if (isAnyType(input.type)) {
            schema.type = DataTypeName.STRING;
        } else {
            if (parameterType.type) {
                schema.type = parameterType.type as DataTypeName;
            }
            schema.items = parameterType.items;
            schema.enum = parameterType.enum;
        }

        parameter.examples = this.transformParameterExamples(input);

        return parameter;
    }

    private transformParameterExamples(parameter: Parameter) : Record<string, Example> {
        const output : Record<string, Example> = {};
        if (parameter.examples) {
            for (const [i, ex] of parameter.examples.entries()) {
                const label = ex.label || `example${i + 1}`;
                output[label] = { value: ex.value };
            }
        }

        return output;
    }

    private buildServers() : ServerV3[] {
        const servers: ServerV3[] = [];
        const configured = this.config.servers ?? [];
        for (const entry of configured) {
            const url = new URL(entry.url, 'http://localhost:3000/');
            servers.push({
                url: `${url.protocol}//${url.host}${url.pathname || ''}`,
                ...(entry.description ? { description: entry.description } : {}),
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
            schema.anyOf!.push({
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
        for (const member of type.members) {
            if (isEnumType(member)) {
                for (const memberChild of member.members) {
                    if (memberChild === null || memberChild === undefined) {
                        nullable = true;
                        continue;
                    }

                    const typeOf = typeof memberChild;
                    if (typeOf === 'string' || typeOf === 'number' || typeOf === 'boolean') {
                        const bucket = enumMembers[typeOf] ?? (enumMembers[typeOf] = []);
                        bucket.push(memberChild);
                    }
                }
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

        const schemas : SchemaV3[] = [];
        for (const member of members) {
            schemas.push(this.getSchemaForType(member));
        }

        const enumMembersKeys = Object.keys(enumMembers);
        for (const enumMembersKey of enumMembersKeys) {
            const enumType : EnumType = {
                typeName: 'enum',
                members: enumMembers[enumMembersKey]!,
            };
            schemas.push(this.getSchemaForEnumType(enumType));
        }

        // Use oneOf when all non-enum members are object-like types
        const useOneOf = members.length > 0 &&
            enumMembersKeys.length === 0 &&
            members.every((m) => V3Generator.isObjectLikeType(m));

        const compositionKey = useOneOf ? 'oneOf' : 'anyOf';

        if (this.isV31OrLater()) {
            if (nullable) {
                schemas.push({ type: 'null' } as unknown as SchemaV3);
            }

            if (schemas.length === 1) {
                return schemas[0]!;
            }

            const schema: SchemaV3 = { [compositionKey]: schemas };
            if (useOneOf) {
                this.applyDiscriminator(schema, members);
            }
            return schema;
        }

        // 3.0: use nullable keyword
        if (schemas.length === 1) {
            const schema = schemas[0]!;

            if (schema.$ref) {
                return { allOf: [schema], nullable };
            }

            return { ...schema, nullable };
        }

        const schema: SchemaV3 = {
            [compositionKey]: schemas,
            ...(nullable ? { nullable } : {}),
        };
        if (useOneOf) {
            this.applyDiscriminator(schema, members);
        }
        return schema;
    }

    /**
     * Whether a type is object-shaped: used to decide `oneOf` vs `anyOf` for union
     * composition (below) and, via `isBodyMergeableType`, whether a `@Body` type can
     * hold `@BodyProp` properties alongside it.
     */
    private static isObjectLikeType(type: Type, seen?: Set<string>): boolean {
        if (isRefObjectType(type) ||
            isNestedObjectLiteralType(type) ||
            isIntersectionType(type)) {
            return true;
        }

        // Unwrap refAlias to check the underlying type — a refAlias
        // wrapping a primitive (e.g. `type Id = string`) is not object-like.
        //
        // `seen` stops an alias chain that returns to itself. TypeScript rejects a
        // circular alias (TS2456), so `@trapi/metadata` cannot produce one — but
        // `generateSwagger` takes caller-supplied `Metadata` from any producer, and a
        // `RangeError` is a poor answer for one. A cycle is not object-like.
        if (isRefAliasType(type)) {
            const visited = seen ?? new Set<string>();
            if (visited.has(type.refName)) {
                return false;
            }
            visited.add(type.refName);

            return V3Generator.isObjectLikeType(type.type, visited);
        }

        return false;
    }

    /**
     * Whether a declared `@Body` type can hold the `@BodyProp` properties alongside
     * it. Counterpart to V2's `buildFlattenedBodySchema` — the two must answer for
     * the same set of types, or the emitters disagree on the same metadata. An
     * instance method (unlike `isObjectLikeType`) because a `refObject` needs
     * `this.metadata.referenceTypes` to tell a resolvable reference from a dangling
     * or wrong-kind one.
     *
     * Every `isObjectLikeType` type qualifies, plus `any`/`object`: neither declares
     * properties of its own, but neither excludes any either, so composing with the
     * bodyProp properties via `allOf` is satisfiable. Deliberately NOT folded into
     * `isObjectLikeType` itself — that method also decides `oneOf` vs `anyOf` for
     * union composition, where treating an `any`/`object` member as object-like
     * would wrongly route a union containing one into `oneOf`'s exactly-one-match
     * semantics instead of `anyOf`.
     */
    private isBodyMergeableType(type: Type, seen?: Set<string>): boolean {
        if (isAnyType(type) || isObjectType(type)) {
            return true;
        }

        // `isObjectLikeType` accepts any `refObject` structurally, without
        // resolving it — fine for its own caller (union composition, which doesn't
        // compose a dangling reference into anything). Here, an unresolved or
        // wrong-kind reference would still get merged into an `allOf` as a `$ref`
        // that points at nothing (or at the wrong entry) — reject it the same way
        // V2's `buildFlattenedBodySchema` does, via the identical lookup.
        if (isRefObjectType(type)) {
            const referenceType = this.metadata.referenceTypes[type.refName];
            return !!referenceType && isRefObjectType(referenceType);
        }

        if (isRefAliasType(type)) {
            const visited = seen ?? new Set<string>();
            if (visited.has(type.refName)) {
                return false;
            }
            visited.add(type.refName);

            return this.isBodyMergeableType(type.type, visited);
        }

        return V3Generator.isObjectLikeType(type);
    }

    private applyDiscriminator(schema: SchemaV3, members: Type[]): void {
        const discriminator = this.detectDiscriminator(members);
        if (discriminator) {
            schema.discriminator = discriminator;
        }
    }

    private detectDiscriminator(
        members: Type[],
    ): { propertyName: string; mapping: Record<string, string> } | undefined {
        // Resolve each member to { refName, properties }. Supports both
        // refObject and refAlias members (#783).
        const resolvedMembers = members.map((m) => this.resolveDiscriminatorMember(m));
        if (resolvedMembers.some((m) => !m)) {
            return undefined;
        }

        // Find a common property with distinct enum literal values in each member
        const firstProps = resolvedMembers[0]!.properties;
        for (const prop of firstProps) {
            if (prop.type.typeName !== 'enum') continue;
            const enumType = prop.type as EnumType;
            if (enumType.members.length !== 1) continue;

            const propName = prop.name;
            const mapping: Record<string, string> = {};
            let isDiscriminator = true;

            for (const member of resolvedMembers) {
                const memberProp = member!.properties.find((p) => p.name === propName);
                if (
                    !memberProp ||
                    !memberProp.required ||
                    memberProp.type.typeName !== 'enum' ||
                    (memberProp.type as EnumType).members.length !== 1
                ) {
                    isDiscriminator = false;
                    break;
                }

                const value = String((memberProp.type as EnumType).members[0]);
                if (mapping[value]) {
                    isDiscriminator = false;
                    break;
                }
                mapping[value] = `${this.getRefPrefix()}${member!.refName}`;
            }

            if (isDiscriminator && Object.keys(mapping).length === members.length) {
                return { propertyName: propName, mapping };
            }
        }

        return undefined;
    }

    /**
     * Resolve a union member to its refName and properties for discriminator
     * detection. Accepts both refObject and refAlias members, unwrapping
     * aliases to find the underlying properties while preserving the
     * original refName for $ref mapping.
     */
    private resolveDiscriminatorMember(
        member: Type,
    ): { refName: string; properties: ResolverProperty[] } | undefined {
        if (!isRefObjectType(member) && !isRefAliasType(member)) {
            return undefined;
        }

        const { refName } = member as RefObjectType | RefAliasType;
        const referenceType = this.metadata.referenceTypes[refName];
        if (!referenceType) {
            return undefined;
        }

        if (referenceType.typeName === 'refObject') {
            return { refName, properties: (referenceType as RefObjectType).properties };
        }

        if (referenceType.typeName === 'refAlias') {
            let inner: Type = (referenceType as RefAliasType).type;
            for (let depth = 0; depth < 10; depth++) {
                if (isRefObjectType(inner)) {
                    const resolved = this.metadata.referenceTypes[inner.refName];
                    if (resolved?.typeName === 'refObject') {
                        return { refName, properties: (resolved as RefObjectType).properties };
                    }
                    return undefined;
                }
                if (isNestedObjectLiteralType(inner)) {
                    return { refName, properties: (inner as NestedObjectLiteralType).properties };
                }
                if (isRefAliasType(inner)) {
                    inner = (inner as RefAliasType).type;
                    continue;
                }
                return undefined;
            }
        }

        return undefined;
    }
}
