/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    NodeBuilderFlags,
    SymbolFlags,
    SyntaxKind,
    isConditionalTypeNode,
    isConstructorDeclaration,
    isEnumDeclaration,
    isEnumMember,
    isExpressionWithTypeArguments,
    isIdentifier,
    isInterfaceDeclaration,
    isLiteralTypeNode,
    isMethodDeclaration,
    isMethodSignature,
    isPropertySignature,
    isTypeAliasDeclaration,
    isTypeReferenceNode,
} from 'typescript';
import type {
    ClassDeclaration,
    ClassElement,
    ConstructorDeclaration,
    Declaration,
    EntityName,
    EnumDeclaration,
    EnumMember,
    ExpressionWithTypeArguments,
    Identifier,
    IndexSignatureDeclaration,
    InterfaceDeclaration,
    Node,
    ParameterDeclaration,
    PropertyDeclaration,
    PropertySignature,
    Symbol as TsSymbol,
    TypeAliasDeclaration,
    TypeElement,
    TypeNode,
    TypeReferenceNode,
    TypeReferenceType,
} from 'typescript';
import {
    TypeName,
    UtilityTypeName,
    isDeprecatedMarker,
    isRefAliasType,
    isRefObjectType,
    namesForMarker,
    tagsForMarker,
} from '@trapi/core';
import type {
    BufferType,
    DateTimeType,
    DateType,
    Extension,
    NestedObjectLiteralType,
    ReferenceType,
    ResolverProperty,
    Type,
} from '@trapi/core';
import { hasDecoratorNamed } from '../../decorator';
import type { IReferenceTypeRegistry, IResolverContext } from '../../../core/metadata/types';
import {
    JSDocTagName,
    getJSDocTagComment,
    getJSDocTagNames,
    hasJSDocTag,
} from '../js-doc';
import { getDeclarationValidators } from '../validator';
import { getInitializerValue } from '../initializer';
import { ResolverError } from '../../../core/error/resolver';
import { getNodeExtensions } from './extension';
import {
    PrimitiveResolver,
    ReferenceResolver,
    ResolverBase,
    resolveArrayType,
    resolveIndexedAccessType,
    resolveIntersectionType,
    resolveLiteralType,
    resolveMappedType,
    resolveObjectLiteralType,
    resolveTupleType,
    resolveTypeOperatorType,
    resolveUnionType,
} from './sub';
import { getLiteralValue } from './sub/literal';
import type {
    OverrideToken,
    SubResolverContext,
    TypeNodeResolverContext,
    UsableDeclaration,
} from './types';
import { getNodeDescription } from './utils';

export class TypeNodeResolver extends ResolverBase {
    private static readonly MAX_DEPTH = 50;

    private readonly typeNode : TypeNode;

    private readonly current: IResolverContext & IReferenceTypeRegistry;

    private readonly parentNode?: Node;

    private context: TypeNodeResolverContext;

    private readonly referencer : TypeNode | undefined;

    private readonly depth: number;

    private readonly primitiveResolver : PrimitiveResolver;

    private readonly referenceResolver : ReferenceResolver;

    constructor(
        typeNode: TypeNode,
        current: IResolverContext & IReferenceTypeRegistry,
        parentNode?: Node,
        context?: TypeNodeResolverContext,
        referencer?: TypeNode,
        depth?: number,
    ) {
        super();

        this.typeNode = typeNode;
        this.current = current;
        this.parentNode = parentNode;
        this.context = context || {};
        this.referencer = referencer;
        this.depth = depth ?? 0;

        this.primitiveResolver = new PrimitiveResolver(current.registry);
        this.referenceResolver = new ReferenceResolver(current.typeChecker);
    }

    /**
     * @deprecated Use resolverCache.clear() on the context instead.
     * Kept for backward compatibility — no-ops since cache is now instance-scoped.
     */
    public static clearCache() {
        // Cache is now instance-scoped via IResolverContext.resolverCache.
        // This method is a no-op for backward compatibility.
    }

    public resolve(): Type {
        if (this.depth > TypeNodeResolver.MAX_DEPTH) {
            throw new ResolverError(
                `Type resolution exceeded maximum depth of ${TypeNodeResolver.MAX_DEPTH}. This usually indicates deeply nested or circular generics.`,
                this.typeNode,
            );
        }

        const ctx = this.createSubResolverContext();

        const result = this.primitiveResolver.resolve(this.typeNode, this.parentNode) ??
            resolveLiteralType(this.typeNode, ctx) ??
            resolveArrayType(this.typeNode, ctx) ??
            resolveUnionType(this.typeNode, ctx) ??
            resolveIntersectionType(this.typeNode, ctx) ??
            resolveObjectLiteralType(this.typeNode, ctx) ??
            resolveTupleType(this.typeNode, ctx) ??
            resolveMappedType(this.typeNode, ctx) ??
            this.resolveConditionalType() ??
            resolveTypeOperatorType(this.typeNode, ctx) ??
            resolveIndexedAccessType(this.typeNode, ctx) ??
            this.resolveTypeReference();

        if (!result) {
            this.throwUnknownType();
        }

        return result;
    }

    private createSubResolverContext(): SubResolverContext {
        return {
            typeChecker: this.current.typeChecker,
            current: this.current,
            parentNode: this.parentNode,
            context: this.context,
            referencer: this.referencer,
            resolveType: (typeNode, parentNode, context, referencer) => (
                this.resolveNestedType(typeNode, parentNode, context, referencer)
            ),
            propertyFromSignature: (sig, overrideToken) => this.propertyFromSignature(sig, overrideToken),
            propertyFromDeclaration: (decl, overrideToken) => (
                this.propertyFromDeclaration(decl, overrideToken)
            ),
            getNodeDescription: (node) => this.getNodeDescription(node),
            getNodeExample: (node) => this.getNodeExample(node),
            getNodeExtensions: (node) => this.getNodeExtensions(node),
        };
    }

    private resolveNestedType(
        typeNode: TypeNode,
        parentNode?: Node,
        context?: TypeNodeResolverContext,
        referencer?: TypeNode,
    ): Type {
        return new TypeNodeResolver(
            typeNode,
            this.current,
            parentNode,
            context,
            referencer,
            this.depth + 1,
        ).resolve();
    }

    private throwUnknownType(): never {
        throw new ResolverError(`Unknown type: ${SyntaxKind[this.typeNode.kind]}`, this.typeNode);
    }

    // ------------------------------------------------------------------
    // Conditional type resolution (kept inline — deeply coupled to reference handling)
    // ------------------------------------------------------------------

    private resolveConditionalType(): Type | undefined {
        if (!isConditionalTypeNode(this.typeNode)) {
            return undefined;
        }

        // When inside a generic type alias (context has entries) and we
        // have a usage-site node (referencer), resolve via the referencer
        // so the checker evaluates with concrete type arguments (#782).
        if (Object.keys(this.context).length > 0 && this.referencer) {
            return this.resolveTypeViaChecker(this.referencer);
        }

        // Delegate conditional type evaluation to the TypeScript type
        // checker. The checker can evaluate any conditional directly,
        // including complex patterns like `typeof globalThis extends
        // { onmessage: any } ? {} : X` from @types/node (#753).
        return this.resolveTypeViaChecker(this.typeNode);
    }

    // ------------------------------------------------------------------
    // Type reference resolution (kept inline — deeply coupled to caching/utility types)
    // ------------------------------------------------------------------

    private resolveTypeReference(): Type | undefined {
        if (this.typeNode.kind !== SyntaxKind.TypeReference) {
            return undefined;
        }

        const typeReference = this.typeNode as TypeReferenceNode;

        if (typeReference.typeName.kind === SyntaxKind.Identifier) {
            if (
                typeReference.typeName.text === 'Record' &&
                typeReference.typeArguments &&
                typeReference.typeArguments[1]
            ) {
                return {
                    additionalProperties: this.resolveNestedType(
                        typeReference.typeArguments[1],
                        this.parentNode,
                        this.context,
                    ),
                    typeName: TypeName.NESTED_OBJECT_LITERAL,
                    properties: [],
                } as NestedObjectLiteralType;
            }

            const specialReference = TypeNodeResolver.resolveSpecialReference(typeReference.typeName);
            if (typeof specialReference !== 'undefined') {
                return specialReference;
            }

            if (typeReference.typeName.text === 'Date') {
                return this.getDateType(this.parentNode);
            }

            if (
                typeReference.typeName.text === 'Buffer' ||
                typeReference.typeName.text === 'Readable'
            ) {
                return { typeName: TypeName.BUFFER };
            }

            if (
                typeReference.typeName.text === 'Array' &&
                typeReference.typeArguments?.[0]
            ) {
                return {
                    typeName: TypeName.ARRAY,
                    elementType: this.resolveNestedType(
                        typeReference.typeArguments[0],
                        this.parentNode,
                        this.context,
                    ),
                };
            }

            if (
                typeReference.typeName.text === 'Promise' &&
                typeReference.typeArguments?.length === 1 &&
                typeReference.typeArguments[0]
            ) {
                return this.resolveNestedType(
                    typeReference.typeArguments[0],
                    this.parentNode,
                    this.context,
                );
            }

            if (typeReference.typeName.text === 'String') {
                return { typeName: TypeName.STRING };
            }

            const contextual = this.context[typeReference.typeName.text];
            if (contextual) {
                return this.resolveNestedType(
                    contextual,
                    this.parentNode,
                    this.context,
                );
            }

            if (TypeNodeResolver.isCheckerResolvableUtilityType(typeReference.typeName.text)) {
                return this.resolveUtilityTypeViaChecker(typeReference);
            }
        }

        try {
            const referenceType = this.getReferenceType(typeReference);

            this.current.addReferenceType(referenceType);
            return referenceType;
        } catch (err) {
            // When the model declaration walker fails (e.g. for global types
            // like Headers, Request, Response from @types/node that use
            // complex declaration patterns — #753), fall back to the checker.
            // If the checker also fails, re-throw the original error.
            try {
                return this.resolveTypeViaChecker(typeReference);
            } catch {
                throw err;
            }
        }
    }

    // ------------------------------------------------------------------------
    // Utility Type(s)
    // ------------------------------------------------------------------------

    private static readonly CHECKER_RESOLVABLE_UTILITY_TYPES: ReadonlySet<string> = new Set([
        UtilityTypeName.NON_NULLABLE,
        UtilityTypeName.OMIT,
        UtilityTypeName.PARTIAL,
        UtilityTypeName.READONLY,
        UtilityTypeName.REQUIRED,
        UtilityTypeName.PICK,
        UtilityTypeName.EXTRACT,
        UtilityTypeName.EXCLUDE,
        UtilityTypeName.RETURN_TYPE,
        UtilityTypeName.PARAMETERS,
        UtilityTypeName.AWAITED,
        UtilityTypeName.INSTANCE_TYPE,
        UtilityTypeName.CONSTRUCTOR_PARAMETERS,
    ]);

    private static isCheckerResolvableUtilityType(name: string): boolean {
        return TypeNodeResolver.CHECKER_RESOLVABLE_UTILITY_TYPES.has(name);
    }

    private resolveUtilityTypeViaChecker(typeReference: TypeReferenceNode): Type {
        // When type arguments reference unbound type parameters from our
        // context (e.g. `Awaited<T>` inside `type Box<T> = Awaited<T>`),
        // the checker can't resolve them from the declaration-site node.
        // Use the referencer (usage-site node like `Box<Promise<Foo>>`)
        // which the checker CAN resolve with concrete type arguments.
        if (this.hasUnboundContextArgs(typeReference) && this.referencer) {
            return this.resolveTypeViaChecker(this.referencer);
        }

        return this.resolveTypeViaChecker(typeReference);
    }

    /**
     * Shared checker delegation: resolves a type node by letting the TS
     * type checker evaluate it, converting back to a TypeNode, and
     * recursively resolving the result.
     */
    private resolveTypeViaChecker(typeNode: TypeNode): Type {
        const type = this.current.typeChecker.getTypeFromTypeNode(typeNode);
        // InTypeAlias prevents the node builder from emitting type alias
        // references (which could cause circular resolution when the utility
        // type is used inside a type alias declaration).
        const resolvedTypeNode = this.current.typeChecker.typeToTypeNode(
            type,
            undefined,
            NodeBuilderFlags.NoTruncation | NodeBuilderFlags.InTypeAlias,
        );

        // typeToTypeNode returns undefined for some edge cases (e.g. empty
        // tuples from Parameters<> of a no-arg function). Fall back to an
        // empty tuple type.
        if (!resolvedTypeNode) {
            return { typeName: TypeName.TUPLE, elements: [] };
        }

        return this.resolveNestedType(
            resolvedTypeNode,
            this.parentNode,
            this.context,
        );
    }

    /**
     * Check if a type reference has type arguments that reference unbound
     * type parameters from this.context (e.g. `Awaited<T>` where T is a
     * generic parameter mapped in context).
     */
    private hasUnboundContextArgs(typeReference: TypeReferenceNode): boolean {
        if (!typeReference.typeArguments || Object.keys(this.context).length === 0) {
            return false;
        }

        return typeReference.typeArguments.some((arg) =>
            isTypeReferenceNode(arg) &&
            isIdentifier(arg.typeName) &&
            arg.typeName.text in this.context);
    }

    private static resolveSpecialReference(node: Identifier) : Type | undefined {
        switch (node.text) {
            case 'Buffer':
            case 'DownloadBinaryData':
            case 'DownloadResource':
                return { typeName: TypeName.BUFFER } as BufferType;
            default:
                return undefined;
        }
    }

    private getDateType(parentNode?: Node): DateType | DateTimeType {
        if (!parentNode) {
            return { typeName: TypeName.DATETIME };
        }
        const tags = getJSDocTagNames(parentNode).filter((name) => ['isDate', 'isDateTime'].includes(name));

        if (tags.length === 0) {
            return { typeName: TypeName.DATETIME };
        }

        switch (tags[0]) {
            case 'isDate':
                return { typeName: TypeName.DATE };
            default:
                return { typeName: TypeName.DATETIME };
        }
    }

    private static getDesignatedModels<T extends Node>(nodes: T[], _typeName: string): T[] {
        return nodes;
    }

    private getReferenceType(node: TypeReferenceType): ReferenceType {
        let type: EntityName;
        if (isTypeReferenceNode(node)) {
            type = node.typeName;
        } else if (isExpressionWithTypeArguments(node)) {
            type = node.expression as EntityName;
        } else {
            throw new ResolverError('Can\'t resolve reference type.');
        }

        // Can't invoke getText on Synthetic Nodes
        let resolvableName = node.pos !== -1 ? node.getText() : (type as Identifier).text;
        if (node.pos === -1 && 'typeArguments' in node && Array.isArray(node.typeArguments)) {
            // Add typeArguments for Synthetic nodes (e.g. Record<> in TestClassModel.indexedResponse)
            const argumentsString = node.typeArguments
                .map((arg) => {
                    if (isLiteralTypeNode(arg)) {
                        return `'${String(getLiteralValue(arg))}'`;
                    }
                    const resolvedType = this.primitiveResolver.resolveSyntaxKind(arg.kind);
                    if (
                        typeof resolvedType === 'undefined'
                    ) { return 'any'; }
                    return resolvedType;
                });

            resolvableName += `<${argumentsString.join(', ')}>`;
        }

        const name = this.contextualizedName(resolvableName);

        this.typeArgumentsToContext(node, type, this.context);

        try {
            const existingType = this.current.resolverCache.getCachedType(name);
            if (existingType) {
                return existingType;
            }

            if (this.current.resolverCache.isInProgress(name)) {
                return this.createCircularDependencyResolver(name);
            }

            this.current.resolverCache.markInProgress(name);

            try {
                const refName = TypeNodeResolver.getRefTypeName(name);
                const declarations = this.getModelTypeDeclarations(type);
                const referenceTypes: ReferenceType[] = [];
                for (const declaration of declarations) {
                    if (isTypeAliasDeclaration(declaration)) {
                        referenceTypes.push(
                            this.getTypeAliasReference(
                                declaration,
                                name,
                                node,
                            ),
                        );
                    } else if (isEnumDeclaration(declaration)) {
                        referenceTypes.push(this.referenceResolver.transformEnum(declaration, refName));
                    } else if (isEnumMember(declaration)) {
                        referenceTypes.push(this.referenceResolver.transformEnumMember(declaration, refName));
                    } else {
                        // todo: dont cast handle property-signature
                        referenceTypes.push(
                            this.getModelReference(
                                declaration as InterfaceDeclaration,
                                name,
                            ),
                        );
                    }
                }

                const referenceType = this.referenceResolver.merge(referenceTypes);

                this.current.resolverCache.setCachedType(name, referenceType);
                return referenceType;
            } finally {
                this.current.resolverCache.clearInProgress(name);
            }
        } catch (err) {
            throw new ResolverError(
                `There was a problem resolving type of '${name}'.`,
                node,
                { cause: err },
            );
        }
    }

    private getTypeAliasReference(
        declaration: TypeAliasDeclaration,
        name: string,
        referencer: TypeReferenceType,
    ): ReferenceType {
        const refName = TypeNodeResolver.getRefTypeName(name);

        if (declaration.type.kind === SyntaxKind.TypeReference) {
            const innerRef = declaration.type as TypeReferenceNode;
            // Record<K,V> and checker-resolvable utility types (Pick, Omit, etc.)
            // should not go through getReferenceType — resolveNestedType handles
            // them correctly via resolveTypeReference.
            const innerName = isIdentifier(innerRef.typeName) ? innerRef.typeName.text : undefined;
            const skipReferenceType = innerName === UtilityTypeName.RECORD ||
                (innerName !== undefined && TypeNodeResolver.isCheckerResolvableUtilityType(innerName));

            if (!skipReferenceType) {
                const referenceType = this.getReferenceType(innerRef);
                if (referenceType.refName === refName) {
                    return referenceType;
                }
            }
        }

        const type = this.resolveNestedType(
            declaration.type,
            declaration,
            this.context,
            this.referencer || referencer,
        );

        const example = this.getNodeExample(declaration);

        return {
            typeName: TypeName.REF_ALIAS,
            default: getJSDocTagComment(declaration, JSDocTagName.DEFAULT),
            description: this.getNodeDescription(declaration),
            refName,
            format: TypeNodeResolver.getNodeFormat(declaration),
            type,
            validators: getDeclarationValidators(declaration) || {},
            deprecated: hasJSDocTag(declaration, JSDocTagName.DEPRECATED),
            ...(example && { example }),
        };
    }

    private getModelReference(
        modelType: InterfaceDeclaration | ClassDeclaration,
        name: string,
    ) : ReferenceType {
        const example = this.getNodeExample(modelType);
        const description = this.getNodeDescription(modelType);
        const deprecatedDecoratorNames = namesForMarker(this.current.registry, isDeprecatedMarker);
        const deprecatedJsDocTags = tagsForMarker(this.current.registry, isDeprecatedMarker);
        const deprecated : boolean =            [...deprecatedJsDocTags].some((tag) => hasJSDocTag(modelType, tag)) ||
            [...deprecatedDecoratorNames].some((name) => hasDecoratorNamed(modelType, name));

        // Handle toJSON methods
        if (!modelType.name) {
            throw new ResolverError('Can\'t get Symbol from anonymous class', modelType);
        }
        const type = this.current.typeChecker.getTypeAtLocation(modelType.name);
        const toJSON = this.current.typeChecker.getPropertyOfType(type, 'toJSON');
        if (
            toJSON &&
            toJSON.valueDeclaration &&
            (
                isMethodDeclaration(toJSON.valueDeclaration) ||
                isMethodSignature(toJSON.valueDeclaration)
            )
        ) {
            let nodeType = toJSON.valueDeclaration.type;
            if (!nodeType) {
                const signature = this.current.typeChecker.getSignatureFromDeclaration(toJSON.valueDeclaration);
                if (signature) {
                    const implicitType = this.current.typeChecker.getReturnTypeOfSignature(signature);
                    nodeType = this.current.typeChecker.typeToTypeNode(implicitType, undefined, NodeBuilderFlags.NoTruncation) as TypeNode;
                } else {
                    throw new ResolverError('Can\'t get signature from toJson value declaration', modelType);
                }
            }

            return {
                refName: `${TypeNodeResolver.getRefTypeName(name)}Alias`,
                typeName: TypeName.REF_ALIAS,
                description,
                type: this.resolveNestedType(nodeType),
                deprecated,
                validators: {},
                ...(example && { example }),
            };
        }

        const properties = this.getModelProperties(modelType);
        const additionalProperties = this.getModelAdditionalProperties(modelType);
        const inheritedProperties = this.getModelInheritedProperties(modelType) || [];

        const referenceType: ReferenceType & { properties: ResolverProperty[] } = {
            additionalProperties,
            typeName: TypeName.REF_OBJECT,
            description,
            properties: inheritedProperties,
            refName: TypeNodeResolver.getRefTypeName(name),
            deprecated,
            ...(example && { example }),
        };

        referenceType.properties = referenceType.properties.concat(properties);

        return referenceType;
    }

    private static getRefTypeName(name: string): string {
        const sanitized = name
            // Structural characters → temporary placeholders
            .replace(/[<>]/g, '_')
            .replace(/[{}]/g, '_')
            .replace(/\s+/g, '')
            // Delimiter characters → semantic names
            .replace(/,/g, '.')
            .replace(/'([^']*)'/g, '$1')
            .replace(/"([^"]*)"/g, '$1')
            .replace(/&/g, '-and-')
            .replace(/\|/g, '-or-')
            .replace(/\[\]/g, '-array')
            .replace(/([a-z]+):([a-z]+)/gi, '$1-$2')
            .replace(/;/g, '--')
            .replace(/([a-z]+)\[([a-z]+)]/gi, '$1-at-$2')
            // Strip temporary placeholders (keep hyphens for semantic separators)
            .replace(/_/g, '');

        return encodeURIComponent(sanitized);
    }

    private contextualizedName(name: string): string {
        return Object.entries(
            this.context,
        ).reduce((acc, [key, entry]) => acc
            .replace(new RegExp(`<\\s*([^>]*\\s)*\\s*(${key})(\\s[^>]*)*\\s*>`, 'g'), `<$1${entry.getText()}$3>`)
            .replace(new RegExp(`<\\s*([^,]*\\s)*\\s*(${key})(\\s[^,]*)*\\s*,`, 'g'), `<$1${entry.getText()}$3,`)
            .replace(new RegExp(`,\\s*([^>]*\\s)*\\s*(${key})(\\s[^>]*)*\\s*>`, 'g'), `,$1${entry.getText()}$3>`)
            .replace(new RegExp(`<\\s*([^<]*\\s)*\\s*(${key})(\\s[^<]*)*\\s*<`, 'g'), `<$1${entry.getText()}$3<`), name);
    }

    private createCircularDependencyResolver(refName: string) {
        const referenceType : ReferenceType = {
            deprecated: false,
            properties: [],
            typeName: TypeName.REF_OBJECT,
            refName,
        };

        this.current.registerDependencyResolver((referenceTypes) => {
            const realReferenceType : ReferenceType | undefined = referenceTypes[refName];
            if (!realReferenceType) {
                return;
            }

            referenceType.description = realReferenceType.description;
            if (realReferenceType.typeName === 'refObject' && referenceType.typeName === 'refObject') {
                referenceType.properties = realReferenceType.properties;
            }
            referenceType.typeName = realReferenceType.typeName as `${TypeName.REF_OBJECT}`;
            referenceType.refName = realReferenceType.refName;
        });

        return referenceType;
    }

    private static nodeIsUsable(node: Node) : node is UsableDeclaration {
        switch (node.kind) {
            case SyntaxKind.InterfaceDeclaration:
            case SyntaxKind.ClassDeclaration:
            case SyntaxKind.TypeAliasDeclaration:
            case SyntaxKind.EnumDeclaration:
            case SyntaxKind.EnumMember:
                return true;
            default:
                return false;
        }
    }

    private getModelTypeDeclarations(type: EntityName) {
        let typeName = type.kind === SyntaxKind.Identifier ? type.text : type.right.text;

        let symbol : TsSymbol | undefined = this.getSymbolAtLocation(type);
        if (!symbol && type.kind === SyntaxKind.QualifiedName) {
            const fullEnumSymbol = this.getSymbolAtLocation(type.left);
            symbol = fullEnumSymbol.exports?.get(typeName as any);
        }

        if (!symbol) {
            throw new ResolverError(
                `No symbol found for referenced type ${typeName}.`,
            );
        }

        const declarations = symbol.getDeclarations();
        if (!declarations || declarations.length === 0) {
            throw new ResolverError(
                `No declarations found for referenced type ${typeName}.`,
            );
        }

        if (symbol.escapedName !== typeName && symbol.escapedName !== 'default') {
            typeName = symbol.escapedName as string;
        }

        let modelTypes = declarations.filter((node) => {
            if (!TypeNodeResolver.nodeIsUsable(node) || !this.current.isExportedNode(node)) {
                return false;
            }

            const modelTypeDeclaration = node as UsableDeclaration;
            return (modelTypeDeclaration.name as Identifier)?.text === typeName;
        });

        if (!modelTypes.length) {
            throw new ResolverError(
                `No matching model found for referenced type ${typeName}. If ${typeName} comes from a dependency, please create an interface in your own code that has the same structure. The compiler can not utilize interfaces from external dependencies.`,
            );
        }

        if (modelTypes.length > 1) {
            // remove types that are from typescript e.g. 'Account'
            modelTypes = modelTypes.filter((modelType) => modelType.getSourceFile()
                .fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') <= -1);

            modelTypes = TypeNodeResolver.getDesignatedModels(modelTypes, typeName);
        }

        return modelTypes;
    }

    private getModelTypeDeclaration(type: EntityName) : UsableDeclaration {
        let typeName = type.kind === SyntaxKind.Identifier ? type.text : type.right.text;

        const symbol = this.getSymbolAtLocation(type);
        const declarations = symbol.getDeclarations();
        if (!declarations || declarations.length === 0) {
            throw new ResolverError(
                `No models found for referenced type ${typeName}.`,
            );
        }

        if (symbol.escapedName !== typeName && symbol.escapedName !== 'default') {
            typeName = symbol.escapedName as string;
        }

        let modelTypes = declarations.filter((node) => {
            if (!TypeNodeResolver.nodeIsUsable(node) || !this.current.isExportedNode(node)) {
                return false;
            }

            const modelTypeDeclaration = node as UsableDeclaration;
            return (modelTypeDeclaration.name as Identifier)?.text === typeName;
        });

        if (!modelTypes.length) {
            throw new ResolverError(
                `No matching model found for referenced type ${typeName}. If ${typeName} comes from a dependency, please create an interface in your own code that has the same structure. The compiler can not utilize interfaces from external dependencies.`,
            );
        }

        if (modelTypes.length > 1) {
            // remove types that are from typescript e.g. 'Account'
            modelTypes = modelTypes.filter((modelType) => modelType.getSourceFile()
                .fileName.replace(/\\/g, '/').toLowerCase().indexOf('node_modules/typescript') <= -1);

            modelTypes = TypeNodeResolver.getDesignatedModels(modelTypes, typeName);
        }
        if (modelTypes.length > 1) {
            const conflicts = modelTypes.map((modelType) => modelType.getSourceFile().fileName).join('"; "');
            throw new ResolverError(
                `Multiple matching models found for referenced type ${typeName}; please make model names unique. Conflicts found: "${conflicts}".`,
            );
        }

        return modelTypes[0] as UsableDeclaration;
    }

    private hasFlag(type: TsSymbol | Declaration, flag: number) {
        return (type.flags & flag) === flag;
    }

    private getSymbolAtLocation(type: Node) : TsSymbol {
        const symbol = this.current.typeChecker.getSymbolAtLocation(type) || ((type as any).symbol as TsSymbol);
        // resolve alias if it is an alias, otherwise take symbol directly
        return (
            symbol &&
            this.hasFlag(symbol, SymbolFlags.Alias) &&
            this.current.typeChecker.getAliasedSymbol(symbol)
        ) || symbol;
    }

    private getModelProperties(
        node: InterfaceDeclaration | ClassDeclaration,
        overrideToken?: OverrideToken,
    ) : ResolverProperty[] {
        const isIgnored = (e: TypeElement | ClassElement) => hasJSDocTag(e, JSDocTagName.IGNORE);

        // Interface model
        if (isInterfaceDeclaration(node)) {
            return node.members
                .filter(
                    (member) => !isIgnored(member) &&
                    isPropertySignature(member),
                ).map(
                    (member) => this.propertyFromSignature(member as PropertySignature, overrideToken),
                );
        }

        // Class model
        const properties = node.members
            .filter((member) => !isIgnored(member) &&
                    member.kind === SyntaxKind.PropertyDeclaration &&
                !this.hasStaticModifier(member) &&
                this.hasPublicModifier(member)) as Array<PropertyDeclaration | ParameterDeclaration>;

        const classConstructor = node.members.find(
            (member) => isConstructorDeclaration(member),
        ) as ConstructorDeclaration;

        if (classConstructor && classConstructor.parameters) {
            const constructorProperties = classConstructor.parameters.filter((parameter) => this.isAccessibleParameter(parameter));

            properties.push(...constructorProperties);
        }

        return properties.map((property) => this.propertyFromDeclaration(property, overrideToken));
    }

    private propertyFromSignature(propertySignature: PropertySignature, overrideToken?: OverrideToken) {
        const identifier = propertySignature.name as Identifier;

        if (!propertySignature.type) {
            throw new ResolverError('No valid type found for property declaration.');
        }

        let required = !propertySignature.questionToken;
        if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
            required = true;
        } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
            required = false;
        }

        const property: ResolverProperty = {
            deprecated: hasJSDocTag(propertySignature, JSDocTagName.DEPRECATED),
            default: getJSDocTagComment(propertySignature, JSDocTagName.DEFAULT),
            description: this.getNodeDescription(propertySignature),
            example: this.getNodeExample(propertySignature),
            extensions: this.getNodeExtensions(propertySignature),
            format: TypeNodeResolver.getNodeFormat(propertySignature),
            name: identifier.text,
            required,
            type: this.resolveNestedType(
                propertySignature.type,
                propertySignature.type.parent,
                this.context,
                propertySignature.type,
            ),
            validators: getDeclarationValidators(propertySignature) || {},
        };
        return property;
    }

    private propertyFromDeclaration(
        propertyDeclaration: PropertyDeclaration | ParameterDeclaration,
        overrideToken?: OverrideToken,
    ) {
        const identifier = propertyDeclaration.name as Identifier;
        let typeNode = propertyDeclaration.type;

        if (!typeNode) {
            const tsType = this.current.typeChecker.getTypeAtLocation(propertyDeclaration);
            typeNode = this.current.typeChecker.typeToTypeNode(tsType, undefined, NodeBuilderFlags.NoTruncation);
        }

        if (!typeNode) {
            throw new ResolverError('No valid type found for property declaration.');
        }

        const type = this.resolveNestedType(typeNode, propertyDeclaration, this.context, typeNode);

        let required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
        if (overrideToken && overrideToken.kind === SyntaxKind.MinusToken) {
            required = true;
        } else if (overrideToken && overrideToken.kind === SyntaxKind.QuestionToken) {
            required = false;
        }

        const property: ResolverProperty = {
            deprecated: hasJSDocTag(propertyDeclaration, JSDocTagName.DEPRECATED),
            default: getInitializerValue(propertyDeclaration.initializer, this.current.typeChecker),
            description: this.getNodeDescription(propertyDeclaration),
            example: this.getNodeExample(propertyDeclaration),
            extensions: this.getNodeExtensions(propertyDeclaration),
            format: TypeNodeResolver.getNodeFormat(propertyDeclaration),
            name: identifier.text,
            required,
            type,
            validators: getDeclarationValidators(propertyDeclaration) || {},
        };
        return property;
    }

    private getModelAdditionalProperties(node: UsableDeclaration) {
        if (node.kind === SyntaxKind.InterfaceDeclaration) {
            const indexMember = node.members.find((member) => member.kind === SyntaxKind.IndexSignature);
            if (!indexMember) {
                return undefined;
            }

            const indexSignatureDeclaration = indexMember as IndexSignatureDeclaration;
            const indexType = this.resolveNestedType(
                indexSignatureDeclaration.parameters[0]!.type as TypeNode,
                this.parentNode,
                this.context,
            );

            if (indexType.typeName !== 'string') {
                throw new ResolverError('Only string indexers are supported.', this.typeNode);
            }

            return this.resolveNestedType(indexSignatureDeclaration.type, this.parentNode, this.context);
        }

        return undefined;
    }

    private typeArgumentsToContext(
        type: TypeReferenceNode | ExpressionWithTypeArguments,
        targetEntity: EntityName,
        context: TypeNodeResolverContext,
    ): TypeNodeResolverContext {
        // this.context = {};

        const declaration = this.getModelTypeDeclaration(targetEntity);
        if (typeof declaration === 'undefined' || !('typeParameters' in declaration)) {
            return context;
        }

        const { typeParameters } = declaration;

        if (typeParameters) {
            for (const [index, typeParameter] of typeParameters.entries()) {
                const typeArg = type.typeArguments && type.typeArguments[index];
                let resolvedType: TypeNode;

                // Argument may be a forward reference from context
                const contextual = typeArg && isTypeReferenceNode(typeArg) && isIdentifier(typeArg.typeName) ?
                    context[typeArg.typeName.text] :
                    undefined;
                if (contextual) {
                    resolvedType = contextual;
                } else if (typeArg) {
                    resolvedType = typeArg;
                } else if (typeParameter.default) {
                    resolvedType = typeParameter.default;
                } else {
                    throw new ResolverError(`Could not find a value for type parameter ${typeParameter.name.text}`, type);
                }

                this.context = {
                    ...this.context,
                    [typeParameter.name.text]: resolvedType,
                };
            }
        }
        return context;
    }

    private getModelInheritedProperties(
        modelTypeDeclaration: Exclude<UsableDeclaration, PropertySignature | TypeAliasDeclaration | EnumMember>,
    ): ResolverProperty[] {
        let properties: ResolverProperty[] = [];

        const { heritageClauses } = modelTypeDeclaration;
        if (!heritageClauses) {
            return properties;
        }

        heritageClauses.forEach((clause) => {
            if (!clause.types) {
                return;
            }

            clause.types.forEach((t) => {
                const baseEntityName = t.expression as EntityName;

                // create subContext
                const resetCtx = this.typeArgumentsToContext(t, baseEntityName, this.context);

                const referenceType = this.getReferenceType(t);
                if (referenceType) {
                    if (isRefAliasType(referenceType)) {
                        let type: Type = referenceType;
                        while (isRefAliasType(type)) {
                            type = type.type;
                        }

                        if (type.typeName === TypeName.REF_OBJECT) {
                            properties = [...properties, ...type.properties];
                        } else if (type.typeName === TypeName.NESTED_OBJECT_LITERAL) {
                            properties = [...properties, ...type.properties];
                        }
                    }

                    if (isRefObjectType(referenceType)) {
                        referenceType.properties.forEach((property) => properties.push(property));
                    }
                }

                // reset subContext
                this.context = resetCtx;
            });
        });

        return properties;
    }

    private getNodeDescription(node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration | EnumDeclaration) {
        return getNodeDescription(node, this.current.typeChecker);
    }

    private static getNodeFormat(
        node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration | EnumDeclaration,
    ) {
        return getJSDocTagComment(node, JSDocTagName.FORMAT);
    }

    private getNodeExample(node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration | EnumDeclaration) {
        const example = getJSDocTagComment(node, JSDocTagName.EXAMPLE);

        if (example) {
            try {
                return JSON.parse(example);
            } catch {
                return example;
            }
        }

        return undefined;
    }

    protected getNodeExtensions(node: UsableDeclaration | PropertyDeclaration | ParameterDeclaration | EnumDeclaration) : Extension[] {
        return getNodeExtensions(node, this.current.registry);
    }
}
