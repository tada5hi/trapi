/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isNamedTupleMember, isTupleTypeNode } from 'typescript';
import type { TypeNode } from 'typescript';
import { TypeName } from '../../../../core/types/type-name';
import type {
    SubResolverContext,
    TupleType,
    Type,
} from '../types';

export function resolveTupleType(
    typeNode: TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!isTupleTypeNode(typeNode)) {
        return undefined;
    }

    const elements = typeNode.elements.map((element) => {
        const isNamed = isNamedTupleMember(element);
        const actualType = isNamed ? element.type : element;
        return {
            type: ctx.resolveType(actualType, ctx.parentNode, ctx.context),
            ...(isNamed && { name: element.name.text }),
        };
    });

    return {
        typeName: TypeName.TUPLE,
        elements,
    } as TupleType;
}
