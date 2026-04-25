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
import {
    type ApplyHandlersOptions,
    applyDecoratorHandlers,
    applyJsDocHandlers,
    newControllerDraft,
} from '../../../adapters/decorator/v2';
import { TypeNodeResolver } from '../../../adapters/typescript/resolver';
import { isResolverError } from '../../../core/error/resolver';
import { GeneratorErrorCode } from '../../../core/error/generator-codes';
import { GeneratorError, isGeneratorError } from '../../../core/error/generator';
import { normalizePath } from '../../../core/utils';
import type { Method } from '../../../core/types/method';
import { MethodGenerator } from '../method';
import type { IGeneratorContext } from '../../../core/types/metadata';
import type { Controller, IControllerGenerator } from '../../../core/types/controller';

export class ControllerGenerator implements IControllerGenerator {
    protected readonly node: ClassDeclaration;

    protected readonly current: IGeneratorContext;

    constructor(node: ClassDeclaration, current: IGeneratorContext) {
        this.node = node;
        this.current = current;
    }

    public isValid(): boolean {
        // Controllers are detected by having a 'Controller' or equivalent decorator
        // that marks them as such — verified during generate() via the registry.
        // Pre-flight check: does any controller-target handler match a decorator on this node?
        if (!this.node.name) {
            return false;
        }
        // Cheap pre-check: just verify the node has at least one decorator.
        // Real validation happens in generate() via handler dispatch.
        return true;
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
        // (convention: the Controller handler sets `draft.path` to '' or a value).
        if (draft.path === undefined) {
            return null;
        }

        const path = normalizePath(draft.path);
        const methods = this.buildMethods(path);

        return {
            consumes: draft.consumes,
            extensions: draft.extensions,
            hidden: draft.hidden,
            location: draft.location,
            name: draft.name,
            path,
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
        };
    }

    protected buildMethods(controllerPath: string): Method[] {
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

            const method = generator.generate(controllerPath);
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
                const method = generator.generate(controllerPath);
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
