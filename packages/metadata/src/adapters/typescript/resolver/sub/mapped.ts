/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ts } from '../../../../core/compiler';
import type {
    Declaration,
    ParameterDeclaration,
    PropertyDeclaration,
    PropertySignature,
    Symbol as TsSymbol,
    TypeNode,
} from 'typescript';
import { JSDocTagName } from '../../js-doc';
import { TypeName } from '@trapi/core';
import type { ResolverProperty, Type } from '@trapi/core';
import type { SubResolverContext } from '../types';
import { toTypeNodeOrFail } from '../utils';

export function resolveMappedType(
    typeNode: TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!ts.isMappedTypeNode(typeNode) || !ctx.referencer) {
        return undefined;
    }

    const type = ctx.typeChecker.getTypeFromTypeNode(ctx.referencer);
    const mappedTypeNode = typeNode;
    const { typeChecker } = ctx;

    const getDeclaration = (prop: TsSymbol) => prop.declarations && (prop.declarations[0] as Declaration | undefined);

    const isIgnored = (prop: TsSymbol) => {
        const declaration = getDeclaration(prop);
        const tagNames = prop.getJsDocTags();
        const tagNameIndex = tagNames.findIndex((tag) => tag.name === JSDocTagName.IGNORE);
        if (tagNameIndex >= 0) {
            return true;
        }
        return (
            !!declaration &&
            !ts.isPropertyDeclaration(declaration) &&
            !ts.isPropertySignature(declaration) &&
            !ts.isParameter(declaration)
        );
    };

    const properties: ResolverProperty[] = type
        .getProperties()
        .filter((property) => !isIgnored(property))
        .map((property) => {
            const declaration = getDeclaration(property) as
                PropertySignature |
                PropertyDeclaration |
                ParameterDeclaration |
                undefined;

            // Normalize +? (PlusToken) to ? (QuestionToken) so property helpers treat it as optional
            const overrideToken = mappedTypeNode.questionToken?.kind === ts.SyntaxKind.PlusToken ?
                ts.factory.createToken(ts.SyntaxKind.QuestionToken) :
                mappedTypeNode.questionToken;

            if (declaration && ts.isPropertySignature(declaration)) {
                return { ...ctx.propertyFromSignature(declaration, overrideToken), name: property.getName() };
            }
            if (declaration && (ts.isPropertyDeclaration(declaration) || ts.isParameter(declaration))) {
                return { ...ctx.propertyFromDeclaration(declaration, overrideToken), name: property.getName() };
            }

            let required = (property.flags & ts.SymbolFlags.Optional) === 0;

            const typeNode2 = toTypeNodeOrFail(
                typeChecker,
                typeChecker.getTypeOfSymbolAtLocation(property, typeNode),
                undefined,
                ts.NodeBuilderFlags.NoTruncation,
            );
            if (mappedTypeNode.questionToken && mappedTypeNode.questionToken.kind === ts.SyntaxKind.MinusToken) {
                required = true;
            } else if (
                mappedTypeNode.questionToken &&
                (
                    mappedTypeNode.questionToken.kind === ts.SyntaxKind.QuestionToken ||
                    mappedTypeNode.questionToken.kind === ts.SyntaxKind.PlusToken
                )
            ) {
                required = false;
            }

            return {
                name: property.getName(),
                required,
                deprecated: false,
                type: ctx.resolveType(typeNode2, typeNode, ctx.context, ctx.referencer),
                validators: {},
            };
        });

    return {
        typeName: TypeName.NESTED_OBJECT_LITERAL,
        properties,
    };
}
