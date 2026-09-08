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
    RefAliasType,
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
    isRefAliasType,
    isRefEnumType,
    isRefObjectType,
    isUndefinedType,
    isVoidType,
} from '@trapi/core';
import { URL } from 'node:url';
import { merge } from 'smob';

import type {
    BaseSchema,
    DataFormatName,
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
                method.deprecated = method.deprecated || controller.deprecated || false;
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
            ...this.undeclaredPathVariables(emittedPath, pathParams).map((name) => {
                const description = this.pathParameterDescription(name);

                return {
                    name,
                    in: ParameterSourceV2.PATH,
                    required: true,
                    type: DataTypeName.STRING,
                    ...(description ? { description } : {}),
                };
            }),
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

        // ponytail: duplicated from V3 (v3/module.ts) rather than hoisted into
        // AbstractSpecGenerator — a shared helper costs more lines than the six
        // it saves, and rewrites V3's already-correct path.
        if (bodyParameters.length > 0 && this.hasFormParams(method)) {
            throw new SwaggerError({
                message: `Cannot mix body and form parameters in method '${method.name}'.`,
                code: SwaggerErrorCode.BODY_FORM_CONFLICT,
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

                // `bodyPropParam.required` is the parameter's own flag. `bodyProp` is
                // the emitted schema, where `required` is the array of child property
                // names — never a boolean — so this branch was never taken and every
                // `@BodyProp` came out optional, under an empty `required: []` that
                // draft-04's `minItems: 1` rejects outright.
                if (bodyPropParam.required) {
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

                    // A `@BodyProp` may name a property the body type already declares
                    // required, so the two lists can overlap. Swagger 2.0's `required`
                    // is draft-04's `stringArray` (`uniqueItems: true`), so a repeat
                    // is invalid — the same shape the V3 merge produced across mounts.
                    const merged = [...new Set([
                        ...(bodyParameter.schema.required || []),
                        ...required,
                    ])];

                    // An all-optional body must omit the key — that same `stringArray`
                    // sets `minItems: 1`, so `required: []` is invalid too. The
                    // synthetic-body branch below already guards this.
                    if (merged.length) {
                        bodyParameter.schema.required = merged;
                    }
                } else {
                    // The declared body type is not an object, so the collected
                    // properties replace it wholesale — carry their requiredness
                    // across rather than dropping it on the floor.
                    bodyParameter.schema = schema;

                    if (required.length) {
                        bodyParameter.schema.required = [...new Set(required)];
                    }
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

        // Resolve into a local, never back onto `input`: a `Metadata` is reused
        // across emitted documents (the CLI extracts once and emits every config
        // entry), so rewriting the metadata's own type node leaked into the next
        // one — a `refEnum` parameter came out of v3 as an inline enum instead of
        // a `$ref` whenever v2 had run first.
        const { type, alias } = input.in === ParameterSource.BODY ?
            { type: input.type, alias: undefined } :
            this.dereferenceNonBodyType(input.type);

        const ownDescription = input.in === ParameterSource.PATH ?
            this.pathParameterDescription(input.name, input.description) :
            input.description;

        const parameter = {
            // A dereferenced alias contributes its own description only where the
            // parameter has none — v3 keeps the `$ref` and reads it off the schema,
            // so this is what stops the same alias reading differently per version.
            description: ownDescription || alias?.description || ownDescription,
            in: sourceIn,
            name: input.name,
            required: input.required,
        } as ParameterV2;

        Object.assign(parameter, this.transformExtensions(input.extensions));

        // Swagger 2.0: formData file parameters use type: 'file' directly
        if (
            parameter.in === ParameterSourceV2.FORM_DATA &&
            type.typeName === TypeName.FILE
        ) {
            parameter.type = 'file' as `${DataTypeName}`;
            Object.assign(parameter, this.transformValidators(input.validators));
            return parameter;
        }

        const parameterType = this.getSchemaForType(type);
        const format = alias?.format ?? parameterType.format;
        if (
            parameter.in !== ParameterSourceV2.BODY &&
            format
        ) {
            parameter.format = format as `${DataFormatName}`;
        }

        // collectionFormat, might be valid for all parameters (if value != multi)
        if (
            (parameter.in === ParameterSourceV2.FORM_DATA || parameter.in === ParameterSourceV2.QUERY) &&
            (type.typeName === TypeName.ARRAY || parameterType.type === DataTypeName.ARRAY)
        ) {
            parameter.collectionFormat = input.collectionFormat || this.config.collectionFormat || 'multi';
        }

        if (parameter.in === ParameterSourceV2.BODY) {
            if ((type.typeName === TypeName.ARRAY || parameterType.type === DataTypeName.ARRAY)) {
                parameter.schema = {
                    items: parameterType.items,
                    type: DataTypeName.ARRAY,
                };
            } else if (type.typeName === TypeName.ANY) {
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
        // The alias's validators come first so the parameter's own win on a clash.
        Object.assign(
            parameter,
            this.transformValidators(alias?.validators),
            this.transformValidators(input.validators),
        );

        if (type.typeName === TypeName.ANY) {
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

        const defaultValue = input.default ?? alias?.default;
        if (typeof defaultValue !== 'undefined') {
            parameter.default = defaultValue;
        }

        // A Swagger 2.0 non-body parameter must carry an inline `type` from a small
        // closed set — only `bodyParameter` has a `schema`, so `$ref` and `object`
        // have nowhere to live. `dereferenceNonBodyType` resolves the common
        // references; what reaches here without a usable `type` is something 2.0
        // genuinely cannot model (an object-typed header, a union). Emitting it
        // anyway produced a parameter matching no location branch — 10 validator
        // errors apiece and a document no gateway would import.
        // ponytail: `string` is the lossy floor, not a claim about the type. Emit
        // v3 if the parameter's real shape matters.
        if (!parameter.type || parameter.type === DataTypeName.OBJECT) {
            parameter.type = DataTypeName.STRING;
        }

        return parameter;
    }

    /**
     * Swagger 2.0 non-body parameters have no `schema`, so a reference has nowhere
     * to go. Resolve it to what it points at, so the parameter can carry the inline
     * `type`/`enum`/`items` the 2.0 location subschemas require.
     *
     * A resolved `refAlias` also hands back its own annotations. They are declared
     * on the alias, not on its target — `TypeNodeResolver.getReferenceType` fills
     * `format`, `default`, `description` and `validators` from the alias's JSDoc —
     * and `buildSchemaForRefAlias` already merges the same set into the alias's
     * `definitions` entry. Dropping them here made one document say both things at
     * once: `definitions.Email` carried `format: 'email'` while every parameter of
     * type `Email` was an unconstrained string. Innermost alias wins, matching the
     * `alias ?? target` precedence `buildSchemaForRefAlias` uses.
     *
     * `seen` stops an alias chain that returns to itself. TypeScript rejects a
     * circular alias (TS2456), so `@trapi/metadata` cannot produce one — but
     * `generateSwagger` takes caller-supplied `Metadata` from any producer, and a
     * bare stack overflow is a poor answer for one. A cycle returns the reference
     * untouched, which the `type: 'string'` floor then handles.
     */
    private dereferenceNonBodyType(
        type: Type,
        seen?: Set<string>,
    ) : { type: Type, alias?: RefAliasType } {
        if (isRefEnumType(type)) {
            return {
                type: {
                    typeName: TypeName.ENUM,
                    members: type.members,
                },
            };
        }

        if (isRefAliasType(type)) {
            const visited = seen ?? new Set<string>();
            if (visited.has(type.refName)) {
                return { type };
            }

            visited.add(type.refName);

            const resolved = this.dereferenceNonBodyType(type.type, visited);

            return { type: resolved.type, alias: resolved.alias ?? type };
        }

        return { type };
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

        // Collapse by status BEFORE emitting: document-wide responses go first,
        // so a method's own response with the same status replaces them. It has
        // to happen here rather than on the record below, because the loop also
        // derives `produces` — a response that loses the status key must not
        // leave its media type advertised on an operation that never emits it.
        const responses = new Map<string, Response>();
        for (const res of [...(this.config.responses ?? []), ...method.responses]) {
            responses.set(res.status, res);
        }

        responses.forEach((res: Response) => {
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
