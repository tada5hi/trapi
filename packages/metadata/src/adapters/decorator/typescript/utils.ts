/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    SyntaxKind,
    canHaveDecorators,
    getDecorators,
    isArrayLiteralExpression,
    isCallExpression,
    isIdentifier,
    isNoSubstitutionTemplateLiteral,
    isNumericLiteral,
    isObjectLiteralExpression,
    isPrefixUnaryExpression,
    isPropertyAccessExpression,
    isStringLiteral,
    isTemplateExpression,
} from 'typescript';
import type {
    Expression,
    Node,
    TypeChecker,
} from 'typescript';
import { getInitializerValue } from '../../typescript/initializer';
import type { DecoratorArgument } from '@trapi/core';

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
    if (!canHaveDecorators(node)) {
        return [];
    }
    const decorators = getDecorators(node);
    if (!decorators || decorators.length === 0) {
        return [];
    }

    const output: RawDecorator[] = [];
    for (const decorator of decorators) {
        const { expression } = decorator;
        let name: string | undefined;
        let argumentExpressions: readonly Expression[] = [];

        if (isCallExpression(expression)) {
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

function readDecoratorName(expression: Node): string | undefined {
    if (isIdentifier(expression)) {
        return expression.text;
    }
    if (isPropertyAccessExpression(expression)) {
        return expression.name.text;
    }
    return undefined;
}

export function buildDecoratorArgument(
    expr: Expression,
    typeChecker?: TypeChecker,
): DecoratorArgument {
    if (
        isStringLiteral(expr) ||
        isNumericLiteral(expr) ||
        isNoSubstitutionTemplateLiteral(expr)
    ) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'literal' };
    }

    if (expr.kind === SyntaxKind.TrueKeyword) {
        return { raw: true, kind: 'literal' };
    }

    if (expr.kind === SyntaxKind.FalseKeyword) {
        return { raw: false, kind: 'literal' };
    }

    if (expr.kind === SyntaxKind.NullKeyword) {
        return { raw: null, kind: 'literal' };
    }

    if (
        isPrefixUnaryExpression(expr) &&
        (expr.operator === SyntaxKind.PlusToken || expr.operator === SyntaxKind.MinusToken) &&
        isNumericLiteral(expr.operand)
    ) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'literal' };
    }

    if (isObjectLiteralExpression(expr)) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'object' };
    }

    if (isArrayLiteralExpression(expr)) {
        return { raw: getInitializerValue(expr, typeChecker), kind: 'array' };
    }

    // A template expression is included because the checker folds one whose
    // substitutions are all constants (`` `/${SEGMENT}` `` -> '/segment').
    // It keeps `kind: 'identifier'` — the kind union is public API that
    // third-party presets match on, and `readString` already accepts it.
    if (isIdentifier(expr) || isPropertyAccessExpression(expr) || isTemplateExpression(expr)) {
        const value = getInitializerValue(expr, typeChecker);
        if (typeof value !== 'undefined') {
            return { raw: value, kind: 'identifier' };
        }
        return { raw: undefined, kind: 'unresolvable' };
    }

    return { raw: undefined, kind: 'unresolvable' };
}
