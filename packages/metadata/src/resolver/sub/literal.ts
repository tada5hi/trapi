/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { TypeName } from '../constants';
import { ResolverError } from '../error';
import type { 
    AnyType, 
    EnumType, 
    SubResolverContext, 
    Type, 
} from '../types';

export function resolveLiteralType(
    typeNode: ts.TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (typeNode.kind === ts.SyntaxKind.NullKeyword) {
        return {
            typeName: TypeName.ENUM,
            members: [null],
        } as EnumType;
    }

    if (
        typeNode.kind === ts.SyntaxKind.AnyKeyword ||
        typeNode.kind === ts.SyntaxKind.UnknownKeyword
    ) {
        return { typeName: TypeName.ANY } as AnyType;
    }

    if (ts.isLiteralTypeNode(typeNode)) {
        return {
            typeName: TypeName.ENUM,
            members: [getLiteralValue(typeNode)],
        } as EnumType;
    }

    if (typeNode.kind === ts.SyntaxKind.TemplateLiteralType) {
        const type = ctx.typeChecker.getTypeFromTypeNode(ctx.referencer || typeNode);
        if (type.isUnion() && type.types.every((t) => t.isStringLiteral())) {
            return {
                typeName: TypeName.ENUM,
                members: type.types.map(
                    (t: ts.StringLiteralType) => t.value,
                ),
            } as EnumType;
        }

        throw new ResolverError(
            `Could not resolve type: ${ctx.typeChecker.typeToString(ctx.typeChecker.getTypeFromTypeNode(typeNode), typeNode)}`,
            typeNode,
        );
    }

    if (ts.isParenthesizedTypeNode(typeNode)) {
        return ctx.resolveType(
            typeNode.type,
            typeNode,
            ctx.context,
            ctx.referencer,
        );
    }

    if (
        typeNode.kind === ts.SyntaxKind.ObjectKeyword ||
        ts.isFunctionTypeNode(typeNode)
    ) {
        return { typeName: TypeName.OBJECT };
    }

    return undefined;
}

export function getLiteralValue(typeNode: ts.LiteralTypeNode): string | number | boolean | null {
    let value: boolean | number | string | null;
    switch (typeNode.literal.kind) {
        case ts.SyntaxKind.TrueKeyword:
            value = true;
            break;
        case ts.SyntaxKind.FalseKeyword:
            value = false;
            break;
        case ts.SyntaxKind.StringLiteral:
            value = typeNode.literal.text;
            break;
        case ts.SyntaxKind.NumericLiteral:
            value = Number.parseFloat(typeNode.literal.text);
            break;
        case ts.SyntaxKind.NullKeyword:
            value = null;
            break;
        default:
            if (Object.prototype.hasOwnProperty.call(typeNode.literal, 'text')) {
                value = (typeNode.literal as ts.LiteralExpression).text;
            } else {
                throw new ResolverError(
                    `Couldn't resolve literal node: ${typeNode.literal.getText()}`,
                    typeNode.literal,
                );
            }
    }
    return value;
}
