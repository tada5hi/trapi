/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node, TypeChecker, TypeNode } from 'typescript';
import * as ts from 'typescript';
import type { Type } from '../../../../core/resolver/types';
import type {
    DecoratorArgument,
    DecoratorHost,
    DecoratorSource,
    DecoratorTarget,
    DecoratorTypeArgument,
} from '../source';
import { buildDecoratorArgument } from './argument';

export type DecoratorSourceBuilderOptions = {
    target: DecoratorTarget;
    host: DecoratorHost;
    resolveTypeNode: (node: TypeNode) => Type;
    typeChecker?: TypeChecker;
};

export function buildDecoratorSources(
    node: Node,
    options: DecoratorSourceBuilderOptions,
): DecoratorSource[] {
    if (!ts.canHaveDecorators(node)) {
        return [];
    }

    const decorators = ts.getDecorators(node);
    if (!decorators || decorators.length === 0) {
        return [];
    }

    const output: DecoratorSource[] = [];
    for (const decorator of decorators) {
        const source = buildDecoratorSource(decorator, options);
        if (source) {
            output.push(source);
        }
    }
    return output;
}

function buildDecoratorSource(
    decorator: ts.Decorator,
    options: DecoratorSourceBuilderOptions,
): DecoratorSource | undefined {
    const { expression } = decorator;

    let name: string | undefined;
    let argumentExpressions: readonly ts.Expression[] = [];
    let typeArgumentNodes: readonly ts.TypeNode[] = [];

    if (ts.isCallExpression(expression)) {
        argumentExpressions = expression.arguments;
        typeArgumentNodes = expression.typeArguments ?? [];
        name = readDecoratorName(expression.expression);
    } else {
        name = readDecoratorName(expression);
    }

    if (!name) {
        return undefined;
    }

    const decoratorArguments: DecoratorArgument[] = argumentExpressions.map(
        (arg) => buildDecoratorArgument(arg, options.typeChecker),
    );

    const decoratorTypeArguments: DecoratorTypeArgument[] = typeArgumentNodes.map(
        (typeNode) => ({ resolve: () => options.resolveTypeNode(typeNode) }),
    );

    return {
        name,
        arguments: decoratorArguments,
        typeArguments: decoratorTypeArguments,
        target: options.target,
        host: options.host,
    };
}

function readDecoratorName(expression: ts.Node): string | undefined {
    if (ts.isIdentifier(expression)) {
        return expression.text;
    }
    if (ts.isPropertyAccessExpression(expression)) {
        return expression.name.text;
    }
    return undefined;
}
