/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    NodeBuilderFlags,
    SymbolFlags,
    SyntaxKind,
    factory,
    isMappedTypeNode,
    isParameter,
    isPropertyDeclaration,
    isPropertySignature,
} from 'typescript';
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
    if (!isMappedTypeNode(typeNode) || !ctx.referencer) {
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
            !isPropertyDeclaration(declaration) &&
            !isPropertySignature(declaration) &&
            !isParameter(declaration)
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
            const overrideToken = mappedTypeNode.questionToken?.kind === SyntaxKind.PlusToken ?
                factory.createToken(SyntaxKind.QuestionToken) :
                mappedTypeNode.questionToken;

            if (declaration && isPropertySignature(declaration)) {
                return { ...ctx.propertyFromSignature(declaration, overrideToken), name: property.getName() };
            }
            if (declaration && (isPropertyDeclaration(declaration) || isParameter(declaration))) {
                return { ...ctx.propertyFromDeclaration(declaration, overrideToken), name: property.getName() };
            }

            let required = (property.flags & SymbolFlags.Optional) === 0;

            const typeNode2 = toTypeNodeOrFail(
                typeChecker,
                typeChecker.getTypeOfSymbolAtLocation(property, typeNode),
                undefined,
                NodeBuilderFlags.NoTruncation,
            );
            if (mappedTypeNode.questionToken && mappedTypeNode.questionToken.kind === SyntaxKind.MinusToken) {
                required = true;
            } else if (
                mappedTypeNode.questionToken &&
                (
                    mappedTypeNode.questionToken.kind === SyntaxKind.QuestionToken ||
                    mappedTypeNode.questionToken.kind === SyntaxKind.PlusToken
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
