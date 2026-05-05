/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node, TypeNode } from 'typescript';
import { SyntaxKind } from 'typescript';
import {
    NumericKind,
    TypeName,
    namesForMarker,
    numericMarkerKind,
    tagsForMarker,
} from '@trapi/core';
import type { 
    NeverType, 
    PrimitiveType, 
    Registry, 
    ResolverMarker, 
    VoidType,  
} from '@trapi/core';
import { hasDecoratorNamed } from '../../../decorator';
import { getJSDocTagNames } from '../../js-doc';

const NUMERIC_KIND_TO_TYPE_NAME: Record<string, string> = {
    [NumericKind.Int]: TypeName.INTEGER,
    [NumericKind.Long]: TypeName.LONG,
    [NumericKind.Float]: TypeName.FLOAT,
    [NumericKind.Double]: TypeName.DOUBLE,
};

export class PrimitiveResolver {
    protected registry: Registry;

    constructor(registry: Registry) {
        this.registry = registry;
    }

    resolve(node: TypeNode, parentNode?: Node) : PrimitiveType | NeverType | VoidType | undefined {
        const resolved = this.resolveSyntaxKind(node.kind);
        if (resolved) {
            if (resolved === 'string') {
                return { typeName: TypeName.STRING };
            }

            if (resolved === 'void') {
                return { typeName: TypeName.VOID };
            }

            if (resolved === 'boolean') {
                return { typeName: TypeName.BOOLEAN };
            }

            if (resolved === 'undefined') {
                return { typeName: TypeName.UNDEFINED };
            }

            if (resolved === 'null') {
                // todo: check
                return undefined;
            }

            if (resolved === 'never') {
                return { typeName: TypeName.NEVER };
            }

            if (resolved === 'bigint') {
                return { typeName: TypeName.BIGINT };
            }

            if (resolved === 'number') {
                if (!parentNode) {
                    return { typeName: TypeName.DOUBLE };
                }

                // For each numeric kind: check decorator handlers first (preset
                // may rename `@IsInt`), then JSDoc handlers (preset may rename
                // `@isInt`). Both lookups use the registry markers.
                const presentJsDocTags = new Set(
                    getJSDocTagNames(parentNode).map((tag) => tag.toLowerCase()),
                );
                for (const kind of [NumericKind.Int, NumericKind.Long, NumericKind.Float, NumericKind.Double] as const) {
                    const matchKind = (m: ResolverMarker) => numericMarkerKind(m) === kind;

                    const decoratorNames = namesForMarker(this.registry, matchKind);
                    for (const name of decoratorNames) {
                        if (hasDecoratorNamed(parentNode, name)) {
                            return { typeName: NUMERIC_KIND_TO_TYPE_NAME[kind] } as PrimitiveType;
                        }
                    }

                    const jsDocTags = tagsForMarker(this.registry, matchKind);
                    for (const tag of jsDocTags) {
                        if (presentJsDocTags.has(tag.toLowerCase())) {
                            return { typeName: NUMERIC_KIND_TO_TYPE_NAME[kind] } as PrimitiveType;
                        }
                    }
                }

                return { typeName: TypeName.DOUBLE };
            }
        }

        return undefined;
    }

    resolveSyntaxKind(syntaxKind: SyntaxKind) {
        switch (syntaxKind) {
            case SyntaxKind.StringKeyword:
                return 'string';
            case SyntaxKind.BooleanKeyword:
                return 'boolean';
            case SyntaxKind.VoidKeyword:
                return 'void';
            case SyntaxKind.UndefinedKeyword:
                return 'undefined';
            case SyntaxKind.NullKeyword:
                return 'null';
            case SyntaxKind.NumberKeyword:
                return 'number';
            case SyntaxKind.BigIntKeyword:
                return 'bigint';
            case SyntaxKind.NeverKeyword:
                return 'never';
            default:
                return undefined;
        }
    }
}
