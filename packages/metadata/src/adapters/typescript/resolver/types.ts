/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type * as ts from 'typescript';
import type {
    Extension,
    IReferenceTypeRegistry,
    IResolverContext,
    ResolverProperty,
    Type,
} from '../../../core';

export type OverrideToken = ts.Token<ts.SyntaxKind.QuestionToken> |
ts.Token<ts.SyntaxKind.PlusToken> |
ts.Token<ts.SyntaxKind.MinusToken>;

export type UsableDeclaration = ts.InterfaceDeclaration |
ts.ClassDeclaration |
ts.PropertySignature |
ts.TypeAliasDeclaration |
ts.EnumMember;

export type TypeNodeResolverContext = {
    [name: string]: ts.TypeReferenceNode | ts.TypeNode;
};

export type SubResolverContext = {
    readonly typeChecker: ts.TypeChecker;
    readonly current: IResolverContext & IReferenceTypeRegistry;
    readonly parentNode?: ts.Node;
    readonly context: TypeNodeResolverContext;
    readonly referencer?: ts.TypeNode;

    resolveType(
        typeNode: ts.TypeNode,
        parentNode?: ts.Node,
        context?: TypeNodeResolverContext,
        referencer?: ts.TypeNode,
    ): Type;

    propertyFromSignature(
        sig: ts.PropertySignature,
        overrideToken?: OverrideToken,
    ): ResolverProperty;

    propertyFromDeclaration(
        decl: ts.PropertyDeclaration | ts.ParameterDeclaration,
        overrideToken?: OverrideToken,
    ): ResolverProperty;

    getNodeDescription(
        node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration,
    ): string;

    getNodeExample(
        node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration,
    ): unknown;

    getNodeExtensions(
        node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration,
    ): Extension[];
};

// Re-export domain types so adapter files can import from './types'
export * from '../../../core/types/resolver';
export * from '../../../core/types/type-name';
export * from '../../../core/types/type-guards';
export * from '../../../core/types/extension';
