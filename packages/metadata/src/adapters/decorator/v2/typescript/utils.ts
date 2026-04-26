/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Expression, 
    Node, 
    TypeChecker,
} from 'typescript';
import * as ts from 'typescript';
import { getInitializerValue } from '../../../typescript/initializer';
import type { DecoratorArgument } from '../types';

export type RawDecorator = {
    name: string;
    arguments: DecoratorArgument[];
};

/**
 * Enumerate decorators on a TS node and classify their argument values without
 * going through the registry. Used by read-side consumers (type resolver,
 * extension extraction) that only need decorator names + argument values.
 */
export function readNodeDecorators(node: Node, typeChecker?: TypeChecker): RawDecorator[] {
    if (!ts.canHaveDecorators(node)) {
        return [];
    }
    const decorators = ts.getDecorators(node);
    if (!decorators || decorators.length === 0) {
        return [];
    }

    const output: RawDecorator[] = [];
    for (const decorator of decorators) {
        const { expression } = decorator;
        let name: string | undefined;
        let argumentExpressions: readonly ts.Expression[] = [];

        if (ts.isCallExpression(expression)) {
            argumentExpressions = expression.arguments;
            name = readDecoratorName(expression.expression);
        } else {
            name = readDecoratorName(expression);
        }

        if (!name) {
            continue;
        }

        output.push({
            name,
            arguments: argumentExpressions.map((a) => buildDecoratorArgument(a, typeChecker)),
        });
    }
    return output;
}

export function findDecoratorByName(
    node: Node,
    name: string,
    typeChecker?: TypeChecker,
): RawDecorator | undefined {
    return readNodeDecorators(node, typeChecker).find((d) => d.name === name);
}

export function findDecoratorsByName(
    node: Node,
    name: string,
    typeChecker?: TypeChecker,
): RawDecorator[] {
    return readNodeDecorators(node, typeChecker).filter((d) => d.name === name);
}

export function hasDecoratorNamed(node: Node, name: string, typeChecker?: TypeChecker): boolean {
    return readNodeDecorators(node, typeChecker).some((d) => d.name === name);
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

export function buildDecoratorArgument(
    expr: Expression,
    typeChecker?: TypeChecker,
): DecoratorArgument {
    if (
        ts.isStringLiteral(expr) ||
        ts.isNumericLiteral(expr) ||
        ts.isNoSubstitutionTemplateLiteral(expr)
    ) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'literal' };
    }

    if (expr.kind === ts.SyntaxKind.TrueKeyword) {
        return { raw: true, kind: 'literal' };
    }

    if (expr.kind === ts.SyntaxKind.FalseKeyword) {
        return { raw: false, kind: 'literal' };
    }

    if (expr.kind === ts.SyntaxKind.NullKeyword) {
        return { raw: null, kind: 'literal' };
    }

    if (
        ts.isPrefixUnaryExpression(expr) &&
        (expr.operator === ts.SyntaxKind.PlusToken || expr.operator === ts.SyntaxKind.MinusToken) &&
        ts.isNumericLiteral(expr.operand)
    ) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'literal' };
    }

    if (ts.isObjectLiteralExpression(expr)) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'object' };
    }

    if (ts.isArrayLiteralExpression(expr)) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'array' };
    }

    if (ts.isIdentifier(expr) || ts.isPropertyAccessExpression(expr)) {
        const value = getInitializerValue(expr, typeChecker);
        if (typeof value !== 'undefined') {
            return { raw: value, kind: 'identifier' };
        }
        return { raw: undefined, kind: 'unresolvable' };
    }

    return { raw: undefined, kind: 'unresolvable' };
}
