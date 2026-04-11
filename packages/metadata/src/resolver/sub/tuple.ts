/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { TypeName } from '../constants';
import type { 
    ArrayType, 
    SubResolverContext, 
    Type, 
    UnionType, 
} from '../types';

export function resolveTupleType(
    typeNode: ts.TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!ts.isTupleTypeNode(typeNode)) {
        return undefined;
    }

    const elements = typeNode.elements.map((element) => {
        // Named tuple members (e.g. [name: string, count: number]) wrap the actual type
        const actualType = ts.isNamedTupleMember(element) ? element.type : element;
        return ctx.resolveType(actualType, ctx.parentNode, ctx.context);
    });

    if (elements.length === 0) {
        return {
            typeName: TypeName.ARRAY,
            elementType: { typeName: TypeName.ANY },
        } as ArrayType;
    }

    if (elements.length === 1) {
        return {
            typeName: TypeName.ARRAY,
            elementType: elements[0],
        } as ArrayType;
    }

    // Multiple element types → array with union element type
    return {
        typeName: TypeName.ARRAY,
        elementType: {
            typeName: TypeName.UNION,
            members: elements,
        } as UnionType,
    } as ArrayType;
}
