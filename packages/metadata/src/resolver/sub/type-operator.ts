/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { ResolverError } from '../error';
import type { SubResolverContext, Type } from '../types';
import { toTypeNodeOrFail } from '../utils';

export function resolveTypeOperatorType(
    typeNode: ts.TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!ts.isTypeOperatorNode(typeNode)) {
        return undefined;
    }

    if (typeNode.operator === ts.SyntaxKind.KeyOfKeyword) {
        const type = ctx.typeChecker.getTypeFromTypeNode(typeNode);
        try {
            return ctx.resolveType(
                toTypeNodeOrFail(ctx.typeChecker, type, undefined, ts.NodeBuilderFlags.NoTruncation),
                typeNode,
                ctx.context,
                ctx.referencer,
            );
        } catch (err) {
            const indexedTypeName = ctx.typeChecker.typeToString(
                ctx.typeChecker.getTypeFromTypeNode(typeNode.type),
            );
            throw new ResolverError(
                `Could not determine the keys on ${indexedTypeName}`,
                typeNode,
                { cause: err },
            );
        }
    }

    if (typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) {
        return ctx.resolveType(typeNode.type, typeNode, ctx.context, ctx.referencer);
    }

    return undefined;
}
