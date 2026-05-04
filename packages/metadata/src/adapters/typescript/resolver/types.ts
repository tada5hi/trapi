/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ClassDeclaration,
    EnumDeclaration,
    EnumMember,
    InterfaceDeclaration,
    Node,
    ParameterDeclaration,
    PropertyDeclaration,
    PropertySignature,
    SyntaxKind,
    Token,
    TypeAliasDeclaration,
    TypeChecker,
    TypeNode,
    TypeReferenceNode,
} from 'typescript';
import type {
    Extension,
    IReferenceTypeRegistry,
    IResolverContext,
    ResolverProperty,
    Type,
} from '../../../core';

export type OverrideToken = Token<SyntaxKind.QuestionToken> |
Token<SyntaxKind.PlusToken> |
Token<SyntaxKind.MinusToken>;

export type UsableDeclaration = InterfaceDeclaration |
ClassDeclaration |
PropertySignature |
TypeAliasDeclaration |
EnumMember;

export type TypeNodeResolverContext = {
    [name: string]: TypeReferenceNode | TypeNode;
};

export type SubResolverContext = {
    readonly typeChecker: TypeChecker;
    readonly current: IResolverContext & IReferenceTypeRegistry;
    readonly parentNode?: Node;
    readonly context: TypeNodeResolverContext;
    readonly referencer?: TypeNode;

    resolveType(
        typeNode: TypeNode,
        parentNode?: Node,
        context?: TypeNodeResolverContext,
        referencer?: TypeNode,
    ): Type;

    propertyFromSignature(
        sig: PropertySignature,
        overrideToken?: OverrideToken,
    ): ResolverProperty;

    propertyFromDeclaration(
        decl: PropertyDeclaration | ParameterDeclaration,
        overrideToken?: OverrideToken,
    ): ResolverProperty;

    getNodeDescription(
        node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration | EnumDeclaration,
    ): string;

    getNodeExample(
        node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration | EnumDeclaration,
    ): unknown;

    getNodeExtensions(
        node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration | EnumDeclaration,
    ): Extension[];
};

// Re-export domain types so adapter files can import from './types'
export * from '../../../core/types/resolver';
export * from '../../../core/types/type-name';
export * from '../../../core/types/type-guards';
export * from '../../../core/types/extension';
