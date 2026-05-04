/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    SyntaxKind,
    isFunctionTypeNode,
    isLiteralTypeNode,
    isParenthesizedTypeNode,
} from 'typescript';
import type {
    LiteralExpression,
    LiteralTypeNode,
    StringLiteralType,
    TypeNode,
} from 'typescript';
import { TypeName } from '../../../../core/types/type-name';
import { ResolverError } from '../../../../core/error/resolver';
import type { 
    AnyType, 
    EnumType, 
    SubResolverContext, 
    Type, 
} from '../types';

export function resolveLiteralType(
    typeNode: TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (typeNode.kind === SyntaxKind.NullKeyword) {
        return {
            typeName: TypeName.ENUM,
            members: [null],
        } as EnumType;
    }

    if (
        typeNode.kind === SyntaxKind.AnyKeyword ||
        typeNode.kind === SyntaxKind.UnknownKeyword
    ) {
        return { typeName: TypeName.ANY } as AnyType;
    }

    if (isLiteralTypeNode(typeNode)) {
        return {
            typeName: TypeName.ENUM,
            members: [getLiteralValue(typeNode)],
        } as EnumType;
    }

    if (typeNode.kind === SyntaxKind.TemplateLiteralType) {
        const type = ctx.typeChecker.getTypeFromTypeNode(ctx.referencer || typeNode);
        if (type.isUnion() && type.types.every((t) => t.isStringLiteral())) {
            return {
                typeName: TypeName.ENUM,
                members: type.types.map(
                    (t: StringLiteralType) => t.value,
                ),
            } as EnumType;
        }

        throw new ResolverError(
            `Could not resolve type: ${ctx.typeChecker.typeToString(ctx.typeChecker.getTypeFromTypeNode(typeNode), typeNode)}`,
            typeNode,
        );
    }

    if (isParenthesizedTypeNode(typeNode)) {
        return ctx.resolveType(
            typeNode.type,
            typeNode,
            ctx.context,
            ctx.referencer,
        );
    }

    if (
        typeNode.kind === SyntaxKind.ObjectKeyword ||
        isFunctionTypeNode(typeNode)
    ) {
        return { typeName: TypeName.OBJECT };
    }

    return undefined;
}

export function getLiteralValue(typeNode: LiteralTypeNode): string | number | boolean | null {
    let value: boolean | number | string | null;
    switch (typeNode.literal.kind) {
        case SyntaxKind.TrueKeyword:
            value = true;
            break;
        case SyntaxKind.FalseKeyword:
            value = false;
            break;
        case SyntaxKind.StringLiteral:
            value = typeNode.literal.text;
            break;
        case SyntaxKind.NumericLiteral:
            value = Number.parseFloat(typeNode.literal.text);
            break;
        case SyntaxKind.NullKeyword:
            value = null;
            break;
        default:
            if (Object.prototype.hasOwnProperty.call(typeNode.literal, 'text')) {
                value = (typeNode.literal as LiteralExpression).text;
            } else {
                throw new ResolverError(
                    `Couldn't resolve literal node: ${typeNode.literal.getText()}`,
                    typeNode.literal,
                );
            }
    }
    return value;
}
