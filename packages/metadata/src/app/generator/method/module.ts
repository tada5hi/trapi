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
    isVoidType,
    newMethodDraft,
} from '@trapi/core';
import type {
    BaseType,
    Example,
    Method,
    Parameter,
    Response,
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

    public generate(controllerPaths: string[]): Method | null {
        const name = this.getMethodName();
        const draft = newMethodDraft({ name });

        const options = this.applyOptions();
        applyDecoratorHandlers(this.node, this.current.registry.methods, draft, options);
        applyJsDocHandlers(this.node, this.current.registry.methodJsDoc, draft, options);

        // Not a route method (no HTTP verb decorator matched).
        if (!draft.verb) {
            return null;
        }

        // Skip hidden methods entirely (matches v1 behaviour for class member iteration).
        if (draft.hidden) {
            return null;
        }

        // Resolve return type.
        const returnType = this.resolveReturnType();

        // Build responses: handler-supplied first, then a derived default that
        // carries any handler-contributed default-response examples.
        const defaultResponse = buildDefaultResponse(returnType, draft.defaultResponseExamples);
        const responses = mergeDefaultResponse(draft.responses, defaultResponse);

        // Walk parameters.
        const parameters = this.buildParameters(controllerPaths, draft.path, draft.verb);

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
            type: returnType,
            parameters,
        };
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

    private resolveReturnType(): BaseType {
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
                    if (parameter.in === ParameterSource.FORM_DATA) {
                        formParameterCount += 1;
                    }
                    if (parameter.in !== ParameterSource.CONTEXT) {
                        output.push(parameter);
                    }
                }
            } catch (e) {
                const causeMsg = e instanceof Error ? `: ${e.message}` : '';
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

        if (bodyParameterCount > 0 && formParameterCount > 0) {
            throw new GeneratorError({
                message: `Cannot mix body and form parameters in '${controllerId.text}.${methodId.text}' method.`,
                code: GeneratorErrorCode.BODY_FORM_CONFLICT,
            });
        }

        return output;
    }
}

function buildDefaultResponse(returnType: BaseType, examples: Example[]): Response {
    const isVoid = isVoidType(returnType);
    return {
        description: isVoid ? 'No content' : 'Ok',
        examples,
        schema: returnType,
        status: isVoid ? '204' : '200',
        name: isVoid ? '204' : '200',
    };
}

function mergeDefaultResponse(handlerResponses: Response[], defaultResponse: Response): Response[] {
    if (handlerResponses.length === 0) {
        return [defaultResponse];
    }
    const target = handlerResponses.find((r) => r.status === defaultResponse.status);
    if (target) {
        if (defaultResponse.examples && defaultResponse.examples.length > 0 &&
            (!target.examples || target.examples.length === 0)) {
            target.examples = defaultResponse.examples;
        }
        return handlerResponses;
    }
    return [...handlerResponses, defaultResponse];
}
