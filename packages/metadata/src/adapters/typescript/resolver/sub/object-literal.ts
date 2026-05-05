/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    isIdentifier,
    isIndexSignatureDeclaration,
    isNumericLiteral,
    isPropertySignature,
    isStringLiteral,
    isTypeLiteralNode,
} from 'typescript';
import type {
    IndexSignatureDeclaration,
    ParameterDeclaration,
    PropertyDeclaration,
    PropertySignature,
    TypeNode,
} from 'typescript';
import {
    JSDocTagName,
    getJSDocTagComment,
    hasJSDocTag,
} from '../../js-doc';
import { getDeclarationValidators } from '../../validator';
import { TypeName, isStringType  } from '@trapi/core';
import { ResolverError } from '../../../../core/error/resolver';
import type {
    NestedObjectLiteralType,
    ResolverProperty,
    Type,
} from '@trapi/core';
import type { SubResolverContext } from '../types';

export function resolveObjectLiteralType(
    typeNode: TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!isTypeLiteralNode(typeNode)) {
        return undefined;
    }

    const properties: ResolverProperty[] = typeNode.members
        .filter((member) => isPropertySignature(member))
        .reduce((res, propertySignature: PropertySignature) => {
            if (!propertySignature.type) {
                throw new ResolverError('No valid type found for property declaration.', propertySignature);
            }

            const type = ctx.resolveType(
                propertySignature.type,
                propertySignature,
                ctx.context,
            );

            const property: ResolverProperty = {
                deprecated: hasJSDocTag(propertySignature, JSDocTagName.DEPRECATED),
                example: ctx.getNodeExample(propertySignature),
                extensions: ctx.getNodeExtensions(propertySignature),
                default: getJSDocTagComment(propertySignature, JSDocTagName.DEFAULT),
                description: ctx.getNodeDescription(propertySignature),
                format: getNodeFormat(propertySignature),
                name: getPropertyName(propertySignature),
                required: !propertySignature.questionToken,
                type,
                validators: getDeclarationValidators(propertySignature) || {},
            };

            return [property, ...res];
        }, [] as ResolverProperty[]);

    const indexMember = typeNode.members.find(
        (member) => isIndexSignatureDeclaration(member),
    );
    let additionalType: Type | undefined;

    if (indexMember) {
        const indexSignatureDeclaration = indexMember as IndexSignatureDeclaration;
        const indexType = ctx.resolveType(
            indexSignatureDeclaration.parameters[0].type as TypeNode,
            ctx.parentNode,
            ctx.context,
        );

        if (!isStringType(indexType)) {
            throw new ResolverError('Only string indexes are supported.', typeNode);
        }

        additionalType = ctx.resolveType(
            indexSignatureDeclaration.type,
            ctx.parentNode,
            ctx.context,
        );
    }

    return {
        additionalProperties: indexMember && additionalType,
        typeName: TypeName.NESTED_OBJECT_LITERAL,
        properties,
    } as NestedObjectLiteralType;
}

function getNodeFormat(
    node: PropertySignature | PropertyDeclaration | ParameterDeclaration,
) {
    return getJSDocTagComment(node, JSDocTagName.FORMAT);
}

function getPropertyName(node: PropertySignature): string {
    if (isIdentifier(node.name)) {
        return node.name.text;
    }

    if (isStringLiteral(node.name) || isNumericLiteral(node.name)) {
        return node.name.text;
    }

    return node.name.getText();
}
