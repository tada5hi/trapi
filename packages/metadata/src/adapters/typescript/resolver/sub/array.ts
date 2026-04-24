/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { TypeName } from '../../../../core/types/type-name';
import type { ArrayType, SubResolverContext, Type } from '../types';

export function resolveArrayType(
    typeNode: ts.TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!ts.isArrayTypeNode(typeNode)) {
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
