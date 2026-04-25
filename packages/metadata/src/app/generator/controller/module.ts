/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClassDeclaration, Expression, MethodDeclaration } from 'typescript';
import {
    SymbolFlags,
    SyntaxKind,
    isClassDeclaration,
    isMethodDeclaration,
} from 'typescript';
import { DecoratorID } from '../../../core/types/decorator-id';
import { isResolverError } from '../../../core/error/resolver';
import { GeneratorErrorCode } from '../../../core/error/generator-codes';
import { GeneratorError, isGeneratorError } from '../../../core/error/generator';
import { AbstractGenerator } from '../abstract';
import type { Method } from '../../../core/types/method';
import { MethodGenerator } from '../method';
import { getNodeExtensions } from '../../../adapters/typescript/resolver/extension';
import type { IGeneratorContext } from '../../../core/types/metadata';
import type { Controller, IControllerGenerator } from '../../../core/types/controller';

export class ControllerGenerator extends AbstractGenerator<ClassDeclaration> implements IControllerGenerator {
    constructor(node: ClassDeclaration, current: IGeneratorContext) {
        super(node, current);
    }

    public isValid() : boolean {
        const isController = this.current.decoratorResolver.match(
            DecoratorID.CONTROLLER,
            this.node,
        );

        return !!isController;
    }

    public generate(): Controller {
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

        const path = this.buildPath();

        return {
            consumes: this.getConsumes(),
            extensions: getNodeExtensions(this.node, this.current.decoratorResolver),
            hidden: this.isHidden(this.node),
            location: sourceFile.fileName,
            name: this.getCurrentLocation(),
            path,
            produces: this.getProduces(),
            responses: this.buildResponses(),
            security: this.getSecurity(),
            tags: this.getTags(),
            methods: this.buildMethods(path),
        };
    }

    protected getCurrentLocation(): string {
        return (this.node as ClassDeclaration).name.text;
    }

    protected buildMethods(controllerPath: string) : Method[] {
        const set = new Set<string>();
        const output : Method[] = [];

        // Process own methods first
        for (const member of this.node.members) {
            if (!isMethodDeclaration(member) || this.isHidden(member)) {
                continue;
            }

            const generator = new MethodGenerator(member, this.current);
            const methodName = generator.getMethodName();
            if (set.has(methodName) || !generator.isValid()) {
                continue;
            }

            set.add(methodName);
            output.push(generator.generate(controllerPath));
        }

        // Then process inherited methods from base classes
        const inheritedMethods = this.collectInheritedMethodDeclarations(this.node);
        for (const node of inheritedMethods) {
            if (this.isHidden(node)) {
                continue;
            }

            const generator = new MethodGenerator(node, this.current);
            const methodName = generator.getMethodName();
            if (set.has(methodName) || !generator.isValid()) {
                continue;
            }

            set.add(methodName);

            try {
                output.push(generator.generate(controllerPath));
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
