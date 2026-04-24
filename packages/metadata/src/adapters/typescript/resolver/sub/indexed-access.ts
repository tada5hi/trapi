/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { ResolverError } from '../../../../core/error/resolver';
import type { SubResolverContext, Type } from '../types';
import { toTypeNodeOrFail } from '../utils';

export function resolveIndexedAccessType(
    typeNode: ts.TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!ts.isIndexedAccessTypeNode(typeNode)) {
        return undefined;
    }

    // Variant 1: T[number] or T[string]
    if (
        typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword ||
        typeNode.indexType.kind === ts.SyntaxKind.StringKeyword
    ) {
        const numberIndexType = typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword;
        const objectType = ctx.typeChecker.getTypeFromTypeNode(typeNode.objectType);
        const type = numberIndexType ? objectType.getNumberIndexType() : objectType.getStringIndexType();
        if (type === undefined) {
            throw new ResolverError(
                `Could not determine ${numberIndexType ? 'number' : 'string'} index on ${ctx.typeChecker.typeToString(objectType)}`,
                typeNode,
            );
        }
        return ctx.resolveType(
            toTypeNodeOrFail(ctx.typeChecker, type, undefined, undefined),
            typeNode,
            ctx.context,
            ctx.referencer,
        );
    }

    // Variant 2: T['key'] or T[0]
    if (
        ts.isLiteralTypeNode(typeNode.indexType) &&
        (
            ts.isStringLiteral(typeNode.indexType.literal) ||
            ts.isNumericLiteral(typeNode.indexType.literal)
        )
    ) {
        const hasType = (node: ts.Node | undefined): node is ts.HasType => node !== undefined &&
            Object.prototype.hasOwnProperty.call(node, 'type');

        const symbol = ctx.typeChecker.getPropertyOfType(
            ctx.typeChecker.getTypeFromTypeNode(typeNode.objectType),
            typeNode.indexType.literal.text,
        );

        if (symbol === undefined) {
            throw new ResolverError(
                `Could not determine the keys on ${ctx.typeChecker.typeToString(ctx.typeChecker.getTypeFromTypeNode(typeNode.objectType))}`,
                typeNode,
            );
        }

        if (hasType(symbol.valueDeclaration) && symbol.valueDeclaration.type) {
            return ctx.resolveType(
                symbol.valueDeclaration.type,
                typeNode,
                ctx.context,
                ctx.referencer,
            );
        }

        const declaration = ctx.typeChecker.getTypeOfSymbolAtLocation(symbol, typeNode.objectType);
        try {
            return ctx.resolveType(
                toTypeNodeOrFail(ctx.typeChecker, declaration, undefined, undefined),
                typeNode,
                ctx.context,
                ctx.referencer,
            );
        } catch (err) {
            throw new ResolverError(
                `Could not determine the keys on ${ctx.typeChecker.typeToString(declaration)}`,
                typeNode,
                { cause: err },
            );
        }
    }

    return undefined;
}
