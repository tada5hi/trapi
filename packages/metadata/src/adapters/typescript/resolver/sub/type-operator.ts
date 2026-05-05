/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NodeBuilderFlags, SyntaxKind, isTypeOperatorNode } from 'typescript';
import type { TypeNode } from 'typescript';
import { ResolverError } from '../../../../core/error/resolver';
import type { Type } from '@trapi/core';
import type { SubResolverContext } from '../types';
import { toTypeNodeOrFail } from '../utils';

export function resolveTypeOperatorType(
    typeNode: TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!isTypeOperatorNode(typeNode)) {
        return undefined;
    }

    if (typeNode.operator === SyntaxKind.KeyOfKeyword) {
        const type = ctx.typeChecker.getTypeFromTypeNode(typeNode);
        try {
            return ctx.resolveType(
                toTypeNodeOrFail(ctx.typeChecker, type, undefined, NodeBuilderFlags.NoTruncation),
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

    if (typeNode.operator === SyntaxKind.ReadonlyKeyword) {
        return ctx.resolveType(typeNode.type, typeNode, ctx.context, ctx.referencer);
    }

    return undefined;
}
