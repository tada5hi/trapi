/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import {
    JSDocTagName,
    getJSDocTagComment,
    hasJSDocTag,
} from '../../js-doc';
import { getDeclarationValidators } from '../../validator';
import { TypeName } from '../../../../core/types/type-name';
import { ResolverError } from '../../../../core/error/resolver';
import { isStringType } from '../../../../core/types/type-guards';
import type { 
    NestedObjectLiteralType, 
    ResolverProperty, 
    SubResolverContext, 
    Type, 
} from '../types';

export function resolveObjectLiteralType(
    typeNode: ts.TypeNode,
    ctx: SubResolverContext,
): Type | undefined {
    if (!ts.isTypeLiteralNode(typeNode)) {
        return undefined;
    }

    const properties: ResolverProperty[] = typeNode.members
        .filter((member) => ts.isPropertySignature(member))
        .reduce((res, propertySignature: ts.PropertySignature) => {
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
        (member) => ts.isIndexSignatureDeclaration(member),
    );
    let additionalType: Type | undefined;

    if (indexMember) {
        const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
        const indexType = ctx.resolveType(
            indexSignatureDeclaration.parameters[0].type as ts.TypeNode,
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
    node: ts.PropertySignature | ts.PropertyDeclaration | ts.ParameterDeclaration,
) {
    return getJSDocTagComment(node, JSDocTagName.FORMAT);
}

function getPropertyName(node: ts.PropertySignature): string {
    if (ts.isIdentifier(node.name)) {
        return node.name.text;
    }

    if (ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) {
        return node.name.text;
    }

    return node.name.getText();
}
