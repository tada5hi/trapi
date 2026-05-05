/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClassDeclaration, 
    Expression, 
    MethodDeclaration, 
    TypeNode,
} from 'typescript';
import {
    SymbolFlags,
    SyntaxKind,
    isClassDeclaration,
    isMethodDeclaration,
} from 'typescript';
import { newControllerDraft } from '@trapi/core';
import {
    type ApplyHandlersOptions,
    applyDecoratorHandlers,
    applyJsDocHandlers,
} from '../../../adapters/decorator';
import { TypeNodeResolver } from '../../../adapters/typescript/resolver';
import { isResolverError } from '../../../core/error/resolver';
import { GeneratorErrorCode } from '../../../core/error/generator-codes';
import { GeneratorError, isGeneratorError } from '../../../core/error/generator';
import { normalizePath } from '../../../core/utils';
import type { Controller, IControllerGenerator, Method } from '@trapi/core';
import { MethodGenerator } from '../method';
import type { IGeneratorContext } from '../../../core/metadata/types';

export class ControllerGenerator implements IControllerGenerator {
    protected readonly node: ClassDeclaration;

    protected readonly current: IGeneratorContext;

    constructor(node: ClassDeclaration, current: IGeneratorContext) {
        this.node = node;
        this.current = current;
    }

    public isValid(): boolean {
        // Whether a class is a controller depends on whether any registry handler
        // matches one of its decorators (e.g. `@Controller`). Resolving that
        // requires running handler dispatch — which `generate()` does — so
        // `isValid()` only screens out unnamed classes here. `generate()` returns
        // `null` when no controller handler claimed the node.
        return !!this.node.name;
    }

    public generate(): Controller | null {
        if (!this.node.parent) {
            throw new GeneratorError({
                message: 'Controller node doesn\'t have a valid parent source file.',
                code: GeneratorErrorCode.CONTROLLER_NO_SOURCE_FILE,
            });
        }
        if (!this.node.name) {
            throw new GeneratorError({
                message: 'Controller node doesn\'t have a valid name.',
                code: GeneratorErrorCode.CONTROLLER_NO_NAME,
            });
        }

        const sourceFile = this.node.parent.getSourceFile();
        const draft = newControllerDraft({
            name: this.node.name.text,
            location: sourceFile.fileName,
        });

        const options = this.applyOptions();
        applyDecoratorHandlers(this.node, this.current.registry.controllers, draft, options);
        applyJsDocHandlers(this.node, this.current.registry.controllerJsDoc, draft, options);

        // A class is a controller iff a controller-target handler claimed it
        // (convention: the Controller handler sets `draft.paths` to a non-undefined value).
        if (draft.paths === undefined) {
            return null;
        }

        // Normalize and dedupe — a user passing `@Controller(['/roles', '/roles'])`
        // (or paths that collide after normalization) shouldn't produce duplicate
        // OpenAPI path keys downstream.
        const normalized = (draft.paths.length === 0 ? [''] : draft.paths).map(normalizePath);
        const paths = [...new Set(normalized)];
        const methods = this.buildMethods(paths);

        return {
            consumes: draft.consumes,
            deprecated: draft.deprecated,
            extensions: draft.extensions,
            hidden: draft.hidden,
            location: draft.location,
            name: draft.name,
            paths,
            produces: draft.produces,
            responses: draft.responses,
            security: draft.security,
            tags: draft.tags,
            methods,
        };
    }

    private applyOptions(): ApplyHandlersOptions {
        return {
            target: 'class',
            host: { name: this.node.name!.text },
            resolveTypeNode: (n: TypeNode) => new TypeNodeResolver(n, this.current).resolve(),
            typeChecker: this.current.typeChecker,
            onUnmatchedDecorator: (this.current.config.strict || this.current.config.onUnmatchedDecorator) ?
                (report) => this.current.reportUnmatchedDecorator?.(report) :
                undefined,
        };
    }

    protected buildMethods(controllerPaths: string[]): Method[] {
        const set = new Set<string>();
        const output: Method[] = [];

        // Process own methods first
        for (const member of this.node.members) {
            if (!isMethodDeclaration(member)) {
                continue;
            }

            const generator = new MethodGenerator(member, this.current);
            const methodName = generator.getMethodName();
            if (set.has(methodName)) {
                continue;
            }

            const method = generator.generate(controllerPaths);
            if (!method) {
                continue;
            }
            set.add(methodName);
            output.push(method);
        }

        // Then process inherited methods from base classes
        const inheritedMethods = this.collectInheritedMethodDeclarations(this.node);
        for (const node of inheritedMethods) {
            const generator = new MethodGenerator(node, this.current);
            const methodName = generator.getMethodName();
            if (set.has(methodName)) {
                continue;
            }

            try {
                const method = generator.generate(controllerPaths);
                if (!method) {
                    continue;
                }
                set.add(methodName);
                output.push(method);
            } catch (error: unknown) {
                // Skip inherited methods that fail due to unresolvable generic
                // type parameters (e.g., return type T or parameter type T from
                // generic base classes). Rethrow everything else.
                if (
                    isResolverError(error) ||
                    (isGeneratorError(error) &&
                        error.code === GeneratorErrorCode.PARAMETER_GENERATION_FAILED)
                ) {
                    continue;
                }

                throw error;
            }
        }

        return output;
    }

    private collectInheritedMethodDeclarations(node: ClassDeclaration): MethodDeclaration[] {
        const methods: MethodDeclaration[] = [];

        if (!node.heritageClauses) {
            return methods;
        }

        for (const clause of node.heritageClauses) {
            if (clause.token !== SyntaxKind.ExtendsKeyword) {
                continue;
            }

            for (const type of clause.types) {
                const baseDeclaration = this.resolveBaseClassDeclaration(type.expression);
                if (!baseDeclaration) {
                    continue;
                }

                // Collect direct methods from the base class
                for (const member of baseDeclaration.members) {
                    if (isMethodDeclaration(member)) {
                        methods.push(member);
                    }
                }

                // Recurse to pick up the full inheritance chain
                methods.push(...this.collectInheritedMethodDeclarations(baseDeclaration));
            }
        }

        return methods;
    }

    private resolveBaseClassDeclaration(expression: Expression): ClassDeclaration | undefined {
        let symbol = this.current.typeChecker.getSymbolAtLocation(expression);
        if (!symbol) {
            return undefined;
        }

        // Follow import aliases to the original declaration
        if (symbol.flags & SymbolFlags.Alias) {
            symbol = this.current.typeChecker.getAliasedSymbol(symbol);
        }

        const declarations = symbol.getDeclarations();
        if (!declarations || declarations.length === 0) {
            return undefined;
        }

        const declaration = declarations[0];
        if (isClassDeclaration(declaration)) {
            return declaration;
        }

        return undefined;
    }
}
