/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Expression, TypeChecker } from 'typescript';
import * as ts from 'typescript';
import { getInitializerValue } from '../../../typescript/initializer';
import type { DecoratorArgument } from '../types';

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
