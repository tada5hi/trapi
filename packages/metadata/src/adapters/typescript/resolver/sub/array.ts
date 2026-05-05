/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isArrayTypeNode } from 'typescript';
import type { TypeNode } from 'typescript';
import { TypeName } from '@trapi/core';
import type { ArrayType, Type } from '@trapi/core';
import type { SubResolverContext } from '../types';

export function resolveArrayType(
    typeNode: TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!isArrayTypeNode(typeNode)) {
        return undefined;
    }

    return {
        typeName: TypeName.ARRAY,
        elementType: ctx.resolveType(
            typeNode.elementType,
            ctx.parentNode,
            ctx.context,
        ),
    } as ArrayType;
}
