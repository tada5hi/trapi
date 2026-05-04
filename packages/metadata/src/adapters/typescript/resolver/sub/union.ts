/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUnionTypeNode } from 'typescript';
import type { TypeNode } from 'typescript';
import { TypeName } from '../../../../core/types/type-name';
import type { SubResolverContext, Type, UnionType } from '../types';

export function resolveUnionType(
    typeNode: TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!isUnionTypeNode(typeNode)) {
        return undefined;
    }

    const members = typeNode.types.map(
        (type) => ctx.resolveType(type, ctx.parentNode, ctx.context),
    );

    return {
        typeName: TypeName.UNION,
        members,
    } as UnionType;
}
