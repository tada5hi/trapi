/* eslint-disable unicorn/prefer-error-is-error -- Keep compatibility with the published Node.js runtime requirement. */
/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { NodeBuilderFlags } from 'typescript';
import type {
    ClassDeclaration,
    Identifier,
    MethodDeclaration,
    TypeNode,
} from 'typescript';
import {
    ParameterSource,
    isNeverType,
    isVoidType,
    newMethodDraft,
} from '@trapi/core';
import type {
    BaseType,
    Example,
    Method,
    Parameter,
    Response,
    Type,
} from '@trapi/core';
import {
    type ApplyHandlersOptions,
    applyDecoratorHandlers,
    applyJsDocHandlers,
} from '../../../adapters/decorator';
import { GeneratorErrorCode } from '../../../core/error/generator-codes';
import { GeneratorError } from '../../../core/error/generator';
import { TypeNodeResolver } from '../../../adapters/typescript/resolver';
import {
    JSDocTagName,
    getJSDocDescription,
    getJSDocTagComment,
} from '../../../adapters/typescript/js-doc';
import { normalizePath } from '../../../core/utils';
import type { IGeneratorContext } from '../../../core/metadata/types';
import { ParameterGenerator } from '../parameter';
import { NO_CONTENT_STATUSES, SuccessStatusDescription } from './constants';

// One concrete HTTP status code: a success status is never a range, and
// Swagger 2.0 accepts no range as a response key.
const SUCCESS_STATUS_PATTERN = /^[1-5]\d\d$/;

export class MethodGenerator {
    protected readonly node: MethodDeclaration;

    protected readonly current: IGeneratorContext;

    constructor(node: MethodDeclaration, current: IGeneratorContext) {
        this.node = node;
        this.current = current;
    }

    public getMethodName(): string {
        const identifier = this.node.name as Identifier;

        return identifier.text;
    }

    public generate(controllerPaths: string[], controllerSuccessProduces: string[] = []): Method | null {
        const name = this.getMethodName();
        const draft = newMethodDraft({ name });

        const options = this.applyOptions();

        applyDecoratorHandlers(this.node, this.current.registry.methods, draft, options);
        applyJsDocHandlers(this.node, this.current.registry.methodJsDoc, draft, options);

        // Not a route method (no HTTP verb decorator matched), or hidden.
        if ((!draft.verb) || (draft.hidden)) {
            return null;
        }

        // Memoised: a finalizer asking for the return type and the default
        // response below share one resolution.
        let returnType: Type | undefined;
        const resolveReturnType = (): Type => {
            returnType ??= this.resolveReturnType();

            return returnType;
        };

        for (const finalize of this.current.registry.methodFinalizers ?? []) {
            finalize({ host: options.host, returnType: resolveReturnType }, draft);
        }

        // A finalizer may have dropped the verb or hidden the method.
        if ((!draft.verb) || (draft.hidden)) {
            return null;
        }

        this.assertSuccessStatus(draft.successStatus);

        // Only an explicit no-content status drops the body: an implicit 204
        // (a void method) keeps documenting its void schema as it always has.
        const noContent = isNoContentStatus(draft.successStatus);

        // Build responses: handler-supplied first, then a derived default that
        // carries any handler-contributed default-response examples.
        const defaultResponse = buildDefaultResponse({
            returnType: resolveReturnType(),
            examples: draft.defaultResponseExamples,
            successStatus: draft.successStatus,
            noContent,
        });

        // A method's own list overrides the controller's; an explicit
        // no-content status documents no body to describe. `?? []`: the type
        // requires the list, but a finalizer or a hand-built draft may unset it.
        const ownSuccessProduces = draft.successProduces ?? [];
        let successProduces = ownSuccessProduces.length > 0 ? ownSuccessProduces : controllerSuccessProduces;

        if (noContent) {
            successProduces = [];
        }

        const responses = mergeDefaultResponse(
            draft.responses,
            defaultResponse,
            draft.successStatus !== undefined,
            successProduces,
        );

        // Walk parameters. Handler-contributed ones are appended after the
        // signature-derived ones, so a handler can add to the operation but
        // never displace what the method's own arguments put there. They skip
        // ParameterGenerator entirely — there is no declaration behind them.
        const parameters = [
            ...this.buildParameters(controllerPaths, draft.path, draft.verb),
            ...draft.parameters,
        ];

        // Description from leading JSDoc comment (no v2 handler covers this since it
        // isn't a tagged value).
        const description = getJSDocDescription(this.node) ?? draft.description;
        const summary = draft.summary ?? getJSDocTagComment(this.node, JSDocTagName.SUMMARY);

        return {
            consumes: draft.consumes,
            deprecated: draft.deprecated ?? false,
            description: description ?? '',
            extensions: draft.extensions,
            hidden: draft.hidden,
            method: draft.verb,
            name,
            operationId: draft.operationId,
            path: normalizePath(draft.path),
            produces: draft.produces,
            responses,
            security: draft.security,
            summary,
            tags: draft.tags,
            type: resolveReturnType(),
            parameters,
        };
    }

    /**
     * `successStatus` comes from handler code, so a bad value (an empty string,
     * `String(undefined)` from a missing decorator argument) would otherwise
     * become a response key no OpenAPI document accepts.
     */
    private assertSuccessStatus(status: string | undefined): void {
        if (status === undefined || SUCCESS_STATUS_PATTERN.test(status)) {
            return;
        }

        const parentName = (this.node.parent as ClassDeclaration).name?.text;

        throw new GeneratorError({
            message: `Invalid success status '${status}' on '${parentName}.${this.getMethodName()}': ` +
                'a three-digit HTTP status code such as \'201\' or \'202\' is required.',
            code: GeneratorErrorCode.SUCCESS_STATUS_INVALID,
        });
    }

    private applyOptions(): ApplyHandlersOptions {
        const parentName = (this.node.parent as ClassDeclaration).name?.text;

        return {
            target: 'method',
            host: { name: this.getMethodName(), parentName },
            resolveTypeNode: (n: TypeNode) => new TypeNodeResolver(n, this.current).resolve(),
            typeChecker: this.current.typeChecker,
            onUnmatchedDecorator: (this.current.config.strict || this.current.config.onUnmatchedDecorator) ?
                (report) => this.current.reportUnmatchedDecorator?.(report) :
                undefined,
        };
    }

    private resolveReturnType(): Type {
        let nodeType = this.node.type;

        if (!nodeType) {
            const { typeChecker } = this.current;
            const signature = typeChecker.getSignatureFromDeclaration(this.node);

            if (!signature) {
                throw new GeneratorError({ message: 'Could not resolve method signature.' });
            }

            const implicitType = typeChecker.getReturnTypeOfSignature(signature);

            nodeType = typeChecker.typeToTypeNode(implicitType, undefined, NodeBuilderFlags.NoTruncation) as TypeNode;
        }

        return new TypeNodeResolver(nodeType, this.current).resolve();
    }

    private buildParameters(
        controllerPaths: string[],
        methodPath: string,
        verb: string,
    ): Parameter[] {
        const controllerId = (this.node.parent as ClassDeclaration).name as Identifier;
        const methodId = this.node.name as Identifier;
        // Build the union of every (controllerPath × methodPath) combination so
        // path-parameter validation accepts a parameter that's present in any
        // mount (a controller can mount at /roles AND /realms/:id/roles).
        const fullPaths = (controllerPaths.length === 0 ? [''] : controllerPaths)
            .map((cp) => path.posix.join('/', cp, methodPath));

        const output: Parameter[] = [];
        let bodyParameterCount = 0;
        let bodyPropParameterCount = 0;
        let formParameterCount = 0;

        for (const [i, declaration] of this.node.parameters.entries()) {
            try {
                const generator = new ParameterGenerator(
                    declaration,
                    verb,
                    fullPaths,
                    this.current,
                );

                const parameters = generator.generate();

                for (const parameter of parameters) {
                    if (parameter.in === ParameterSource.BODY) {
                        bodyParameterCount += 1;
                    }

                    if (parameter.in === ParameterSource.BODY_PROP) {
                        bodyPropParameterCount += 1;
                    }

                    if (parameter.in === ParameterSource.FORM_DATA) {
                        formParameterCount += 1;
                    }

                    output.push(parameter);
                }
            } catch (e) {
                const causeMsg = (e instanceof Error) ? `: ${e.message}` : '';
                throw new GeneratorError({
                    message: `Parameter generation failed for '${controllerId.text}.${methodId.text}' argument index ${i}${causeMsg}`,
                    code: GeneratorErrorCode.PARAMETER_GENERATION_FAILED,
                    cause: e,
                });
            }
        }

        if (bodyParameterCount > 1) {
            throw new GeneratorError({
                message: `Only one body parameter allowed in '${controllerId.text}.${methodId.text}' method.`,
                code: GeneratorErrorCode.BODY_PARAMETER_DUPLICATE,
            });
        }

        // `@BodyProp` names a key *in* the body, so it conflicts with a form-encoded
        // request exactly as `@Body` does. Counted separately because the check
        // above rejects a second *body*, while several `@BodyProp` are legal.
        if ((bodyParameterCount > 0 || bodyPropParameterCount > 0) && formParameterCount > 0) {
            throw new GeneratorError({
                message: `Cannot mix body and form parameters in '${controllerId.text}.${methodId.text}' method.`,
                code: GeneratorErrorCode.BODY_FORM_CONFLICT,
            });
        }

        return output;
    }
}

type DefaultResponseInput = {
    returnType: BaseType,
    examples: Example[],
    successStatus?: string,
    /**
     * `successStatus` is a status that never carries a body.
     */
    noContent: boolean,
};

function buildDefaultResponse(input: DefaultResponseInput): Response {
    const isVoid = isVoidType(input.returnType);
    const explicit = input.successStatus !== undefined;
    const status = input.successStatus ?? (isVoid ? '204' : '200');

    let description: string;

    if (explicit) {
        description = describeStatus(status);
    } else {
        // Unset: keep the descriptions documents have always carried.
        description = isVoid ? 'No content' : 'Ok';
    }

    // No `schema` key at all under a no-content status, so a fresh result
    // and one read back from the cache have the same shape.
    return {
        description,
        examples: input.examples,
        ...(input.noContent ? {} : { schema: input.returnType }),
        status,
        name: status,
    };
}

/**
 * Gives the response carrying the return type the success media types, but
 * only when it documents a body and declares no media types of its own. An
 * empty list adds no key, so output without `successProduces` is unchanged.
 * Duplicates are dropped, first occurrence kept.
 */
function attachSuccessProduces(response: Response, successProduces: string[]): void {
    if (successProduces.length === 0 || (response.produces && response.produces.length > 0)) {
        return;
    }

    // `void` and `never` are body-less: the emitters document no schema.
    if (!response.schema || isVoidType(response.schema) || isNeverType(response.schema)) {
        return;
    }

    response.produces = [...new Set(successProduces)];
}

function isNoContentStatus(status: string | undefined): boolean {
    return status !== undefined && (NO_CONTENT_STATUSES as readonly string[]).includes(status);
}

function describeStatus(status: string): string {
    return (SuccessStatusDescription as Record<string, string>)[status] ?? 'Ok';
}

/**
 * @param explicit - the status came from `draft.successStatus`: a handler
 * response declared at that status then carries the return type, so it gets
 * the schema when it has none. Without an opt-in a handler response at
 * `200`/`204` stays as declared.
 */
function mergeDefaultResponse(
    handlerResponses: Response[],
    defaultResponse: Response,
    explicit: boolean,
    successProduces: string[],
): Response[] {
    // The last one declared at the status: both emitters keep that one when
    // a status is declared more than once.
    const target = handlerResponses.filter((r) => r.status === defaultResponse.status).at(-1);

    if (!target) {
        attachSuccessProduces(defaultResponse, successProduces);

        return [...handlerResponses, defaultResponse];
    }

    if (defaultResponse.examples && defaultResponse.examples.length > 0 &&
        (!target.examples || target.examples.length === 0)) {
        target.examples = defaultResponse.examples;
    }

    // An explicit no-content status leaves `defaultResponse.schema` unset, so
    // the handler response stays without a body too.
    if (explicit && !target.schema && defaultResponse.schema) {
        target.schema = defaultResponse.schema;
    }

    // Every handler response at the status, not only the first: both
    // emitters keep the last one. Each is judged on its own final schema, as
    // a handler response may document a body even when the method itself
    // returns `void`.
    for (const response of handlerResponses) {
        if (response.status === defaultResponse.status) {
            attachSuccessProduces(response, successProduces);
        }
    }

    return handlerResponses;
}
