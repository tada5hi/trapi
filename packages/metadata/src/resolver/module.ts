/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isEnumDeclaration, isEnumMember } from 'typescript';
import * as ts from 'typescript';
import { DecoratorID } from '../decorator';
import type { IReferenceTypeRegistry, IResolverContext } from '../generator';
import { TypeName, UtilityTypeName } from './constants';

import type { Extension } from './extension';
import {
    JSDocTagName,
    getDeclarationValidators,
    getInitializerValue,
    getJSDocTagComment,
    getJSDocTagNames,
    hasJSDocTag,
} from '../utils';
import { ResolverError } from './error';
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
    resolveTypeOperatorType,
    resolveUnionType,
} from './sub';
import { getLiteralValue } from './sub/literal';
import {
    isRefAliasType,
    isRefObjectType,
} from './type-guards';
import type {
    BufferType,
    DateTimeType,
    DateType,
    NestedObjectLiteralType,
    OverrideToken,
    RefEnumType,
    ReferenceType,
    ResolverProperty,
    SubResolverContext,
    Type,
    TypeNodeResolverContext,
    UsableDeclaration,
} from './types';
import { getNodeDescription, toTypeNodeOrFail } from './utils';

export class TypeNodeResolver extends ResolverBase {
    private static readonly MAX_DEPTH = 50;

    private readonly typeNode : ts.TypeNode;

    private readonly current: IResolverContext & IReferenceTypeRegistry;

    private readonly parentNode?: ts.Node;

    private context: TypeNodeResolverContext;

    private readonly referencer : ts.TypeNode | undefined;

    private readonly depth: number;

    private readonly primitiveResolver : PrimitiveResolver;

    private readonly referenceResolver : ReferenceResolver;

    constructor(
        typeNode: ts.TypeNode,
        current: IResolverContext & IReferenceTypeRegistry,
        parentNode?: ts.Node,
        context?: TypeNodeResolverContext,
        referencer?: ts.TypeNode,
        depth?: number,
    ) {
        super();

        this.typeNode = typeNode;
        this.current = current;
        this.parentNode = parentNode;
        this.context = context || {};
        this.referencer = referencer;
        this.depth = depth ?? 0;

        this.primitiveResolver = new PrimitiveResolver(current.decoratorResolver);
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
        typeNode: ts.TypeNode,
        parentNode?: ts.Node,
        context?: TypeNodeResolverContext,
        referencer?: ts.TypeNode,
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
        throw new ResolverError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`, this.typeNode);
    }

    // ------------------------------------------------------------------
    // Conditional type resolution (kept inline — deeply coupled to reference handling)
    // ------------------------------------------------------------------

    private resolveConditionalType(): Type | undefined {
        if (
            !ts.isConditionalTypeNode(this.typeNode) ||
            !this.referencer ||
            !ts.isTypeReferenceNode(this.referencer)
        ) {
            return undefined;
        }

        const type = this.current.typeChecker.getTypeFromTypeNode(this.referencer);

        if (type.aliasSymbol) {
            let [declaration] = type.aliasSymbol.declarations as (
                ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.DeclarationStatement
            )[];

            if (declaration && declaration.name) {
                declaration = this.getModelTypeDeclaration(
                    declaration.name as ts.EntityName,
                ) as ts.TypeAliasDeclaration |
                ts.EnumDeclaration |
                ts.DeclarationStatement;
            }

            const name = TypeNodeResolver.getRefTypeName(this.referencer.getText());
            return this.handleCachingAndCircularReferences(name, () => {
                if (declaration) {
                    if (ts.isTypeAliasDeclaration(declaration)) {
                        return this.getTypeAliasReference(
                            declaration,
                            this.current.typeChecker.typeToString(type),
                            this.referencer as ts.TypeReferenceNode,
                        );
                    }

                    if (ts.isEnumDeclaration(declaration)) {
                        return this.getEnumerateType(declaration.name) as RefEnumType;
                    }
                }

                const declarationKind = declaration ? ts.SyntaxKind[declaration.kind] : 'unknown';
                throw new ResolverError(
                    `Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. We found an aliasSymbol and its declaration was of kind ${declarationKind}`,
                    this.typeNode,
                );
            });
        }

        if (type.isClassOrInterface()) {
            let [declaration] = type.symbol.declarations as (
                ts.InterfaceDeclaration | ts.ClassDeclaration
            )[];
            if (declaration && declaration.name) {
                declaration = this.getModelTypeDeclaration(declaration.name) as ts.InterfaceDeclaration | ts.ClassDeclaration;
            }

            if (!declaration) {
                throw new ResolverError('Couldn\'t get declaration for type symbol', this.typeNode);
            }

            const name = TypeNodeResolver.getRefTypeName(this.referencer.getText());
            return this.handleCachingAndCircularReferences(name, () => this.getModelReference(
                declaration,
                this.current.typeChecker.typeToString(type),
            ));
        }

        try {
            return this.resolveNestedType(
                toTypeNodeOrFail(
                    this.current.typeChecker,
                    type,
                    undefined,
                    ts.NodeBuilderFlags.NoTruncation,
                ),
                this.typeNode,
                this.context,
                this.referencer,
            );
        } catch (err) {
            throw new ResolverError(
                `Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. The flags on the result of the ConditionalType was ${type.flags}`,
                this.typeNode,
                { cause: err },
            );
        }
    }

    // ------------------------------------------------------------------
    // Type reference resolution (kept inline — deeply coupled to caching/utility types)
    // ------------------------------------------------------------------

    private resolveTypeReference(): Type | undefined {
        if (this.typeNode.kind !== ts.SyntaxKind.TypeReference) {
            return undefined;
        }

        const typeReference = this.typeNode as ts.TypeReferenceNode;

        if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
            if (
                typeReference.typeName.text === 'Record' &&
                typeReference.typeArguments
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
                typeReference.typeArguments &&
                typeReference.typeArguments.length >= 1
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
                typeReference.typeArguments &&
                typeReference.typeArguments.length === 1
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

            if (this.context[typeReference.typeName.text]) {
                return this.resolveNestedType(
                    this.context[typeReference.typeName.text],
                    this.parentNode,
                    this.context,
                );
            }

            if (TypeNodeResolver.isCheckerResolvableUtilityType(typeReference.typeName.text)) {
                return this.resolveUtilityTypeViaChecker(typeReference);
            }
        }

        const referenceType = this.getReferenceType(typeReference);

        this.current.addReferenceType(referenceType);
        return referenceType;
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

    private resolveUtilityTypeViaChecker(typeReference: ts.TypeReferenceNode): Type {
        const type = this.current.typeChecker.getTypeFromTypeNode(typeReference);
        // InTypeAlias prevents the node builder from emitting type alias
        // references (which could cause circular resolution when the utility
        // type is used inside a type alias declaration).
        const resolvedTypeNode = toTypeNodeOrFail(
            this.current.typeChecker,
            type,
            undefined,
            ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.InTypeAlias,
        );

        return this.resolveNestedType(
            resolvedTypeNode,
            this.parentNode,
            this.context,
        );
    }

    private static resolveSpecialReference(node: ts.Identifier) : Type | undefined {
        switch (node.text) {
            case 'Buffer':
            case 'DownloadBinaryData':
            case 'DownloadResource':
                return { typeName: TypeName.BUFFER } as BufferType;
            default:
                return undefined;
        }
    }

    private getDateType(parentNode?: ts.Node): DateType | DateTimeType {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private static getDesignatedModels<T extends ts.Node>(nodes: T[], _typeName: string): T[] {
        return nodes;
    }

    private getEnumerateType(typeName: ts.EntityName): RefEnumType | undefined {
        const enumName = (typeName as ts.Identifier).text;
        let enumNodes = this.current.nodes.filter(
            (node) => node.kind === ts.SyntaxKind.EnumDeclaration && (node as any).name.text === enumName,
        );

        if (!enumNodes.length) {
            return undefined;
        }

        enumNodes = TypeNodeResolver.getDesignatedModels(enumNodes, enumName);

        if (enumNodes.length > 1) {
            throw new ResolverError(`Multiple matching enum found for enum ${enumName}; please make enum names unique.`);
        }

        const enumDeclaration = enumNodes[0] as ts.EnumDeclaration;

        const isNotUndefined = <T>(item: T): item is Exclude<T, undefined> => item !== undefined;

        const enums = enumDeclaration.members.map(this.current.typeChecker.getConstantValue.bind(this.current.typeChecker)).filter(isNotUndefined);
        const enumNames = enumDeclaration.members.map((e) => e.name.getText()).filter(isNotUndefined);

        return {
            typeName: TypeName.REF_ENUM,
            description: this.getNodeDescription(enumDeclaration),
            members: enums as string[],
            memberNames: enumNames,
            refName: enumName,
            deprecated: hasJSDocTag(enumDeclaration, JSDocTagName.DEPRECATED),
        };
    }

    private getReferenceType(node: ts.TypeReferenceType): ReferenceType {
        let type: ts.EntityName;
        if (ts.isTypeReferenceNode(node)) {
            type = node.typeName;
        } else if (ts.isExpressionWithTypeArguments(node)) {
            type = node.expression as ts.EntityName;
        } else {
            throw new ResolverError('Can\'t resolve reference type.');
        }

        // Can't invoke getText on Synthetic Nodes
        let resolvableName = node.pos !== -1 ? node.getText() : (type as ts.Identifier).text;
        if (node.pos === -1 && 'typeArguments' in node && Array.isArray(node.typeArguments)) {
            // Add typeArguments for Synthetic nodes (e.g. Record<> in TestClassModel.indexedResponse)
            const argumentsString = node.typeArguments
                .map((arg) => {
                    if (ts.isLiteralTypeNode(arg)) {
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
                    if (ts.isTypeAliasDeclaration(declaration)) {
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
                                declaration as ts.InterfaceDeclaration,
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
        declaration: ts.TypeAliasDeclaration,
        name: string,
        referencer: ts.TypeReferenceType,
    ): ReferenceType {
        const refName = TypeNodeResolver.getRefTypeName(name);

        if (declaration.type.kind === ts.SyntaxKind.TypeReference) {
            const innerRef = declaration.type as ts.TypeReferenceNode;
            // Record<K,V> and checker-resolvable utility types (Pick, Omit, etc.)
            // should not go through getReferenceType — resolveNestedType handles
            // them correctly via resolveTypeReference.
            const innerName = ts.isIdentifier(innerRef.typeName) ? innerRef.typeName.text : undefined;
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
        modelType: ts.InterfaceDeclaration | ts.ClassDeclaration,
        name: string,
    ) : ReferenceType {
        const example = this.getNodeExample(modelType);
        const description = this.getNodeDescription(modelType);
        const deprecated : boolean = hasJSDocTag(
            modelType,
            JSDocTagName.DEPRECATED,
        ) ||
            !!this.current.decoratorResolver.match(
                DecoratorID.DEPRECATED,
                modelType,
            );

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
                ts.isMethodDeclaration(toJSON.valueDeclaration) ||
                ts.isMethodSignature(toJSON.valueDeclaration)
            )
        ) {
            let nodeType = toJSON.valueDeclaration.type;
            if (!nodeType) {
                const signature = this.current.typeChecker.getSignatureFromDeclaration(toJSON.valueDeclaration);
                if (signature) {
                    const implicitType = this.current.typeChecker.getReturnTypeOfSignature(signature);
                    nodeType = this.current.typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
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

    private handleCachingAndCircularReferences(name: string, declarationResolver: () => ReferenceType): ReferenceType {
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
                const reference = declarationResolver();

                this.current.resolverCache.setCachedType(name, reference);

                this.current.addReferenceType(reference);

                return reference;
            } finally {
                this.current.resolverCache.clearInProgress(name);
            }
        } catch (err) {
            throw new ResolverError(
                `There was a problem resolving type of '${name}'.`,
                this.typeNode,
                { cause: err },
            );
        }
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

    private static nodeIsUsable(node: ts.Node) : node is UsableDeclaration {
        switch (node.kind) {
            case ts.SyntaxKind.InterfaceDeclaration:
            case ts.SyntaxKind.ClassDeclaration:
            case ts.SyntaxKind.TypeAliasDeclaration:
            case ts.SyntaxKind.EnumDeclaration:
            case ts.SyntaxKind.EnumMember:
                return true;
            default:
                return false;
        }
    }

    private getModelTypeDeclarations(type: ts.EntityName) {
        let typeName = type.kind === ts.SyntaxKind.Identifier ? type.text : type.right.text;

        let symbol : ts.Symbol | undefined = this.getSymbolAtLocation(type);
        if (!symbol && type.kind === ts.SyntaxKind.QualifiedName) {
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
            return (modelTypeDeclaration.name as ts.Identifier)?.text === typeName;
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

    private getModelTypeDeclaration(type: ts.EntityName) : UsableDeclaration {
        let typeName = type.kind === ts.SyntaxKind.Identifier ? type.text : type.right.text;

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
            return (modelTypeDeclaration.name as ts.Identifier)?.text === typeName;
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

    private hasFlag(type: ts.Symbol | ts.Declaration, flag: number) {
        return (type.flags & flag) === flag;
    }

    private getSymbolAtLocation(type: ts.Node) : ts.Symbol {
        const symbol = this.current.typeChecker.getSymbolAtLocation(type) || ((type as any).symbol as ts.Symbol);
        // resolve alias if it is an alias, otherwise take symbol directly
        return (
            symbol &&
            this.hasFlag(symbol, ts.SymbolFlags.Alias) &&
            this.current.typeChecker.getAliasedSymbol(symbol)
        ) || symbol;
    }

    private getModelProperties(
        node: ts.InterfaceDeclaration | ts.ClassDeclaration,
        overrideToken?: OverrideToken,
    ) : ResolverProperty[] {
        const isIgnored = (e: ts.TypeElement | ts.ClassElement) => hasJSDocTag(e, JSDocTagName.IGNORE);

        // Interface model
        if (ts.isInterfaceDeclaration(node)) {
            return node.members
                .filter(
                    (member) => !isIgnored(member) &&
                    ts.isPropertySignature(member),
                ).map(
                    (member) => this.propertyFromSignature(member as ts.PropertySignature, overrideToken),
                );
        }

        // Class model
        const properties = node.members
            .filter((member) => !isIgnored(member) &&
                    member.kind === ts.SyntaxKind.PropertyDeclaration &&
                !this.hasStaticModifier(member) &&
                this.hasPublicModifier(member)) as Array<ts.PropertyDeclaration | ts.ParameterDeclaration>;

        const classConstructor = node.members.find(
            (member) => ts.isConstructorDeclaration(member),
        ) as ts.ConstructorDeclaration;

        if (classConstructor && classConstructor.parameters) {
            const constructorProperties = classConstructor.parameters.filter((parameter) => this.isAccessibleParameter(parameter));

            properties.push(...constructorProperties);
        }

        return properties.map((property) => this.propertyFromDeclaration(property, overrideToken));
    }

    private propertyFromSignature(propertySignature: ts.PropertySignature, overrideToken?: OverrideToken) {
        const identifier = propertySignature.name as ts.Identifier;

        if (!propertySignature.type) {
            throw new ResolverError('No valid type found for property declaration.');
        }

        let required = !propertySignature.questionToken;
        if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
            required = true;
        } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
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
        propertyDeclaration: ts.PropertyDeclaration | ts.ParameterDeclaration,
        overrideToken?: OverrideToken,
    ) {
        const identifier = propertyDeclaration.name as ts.Identifier;
        let typeNode = propertyDeclaration.type;

        if (!typeNode) {
            const tsType = this.current.typeChecker.getTypeAtLocation(propertyDeclaration);
            typeNode = this.current.typeChecker.typeToTypeNode(tsType, undefined, ts.NodeBuilderFlags.NoTruncation);
        }

        if (!typeNode) {
            throw new ResolverError('No valid type found for property declaration.');
        }

        const type = this.resolveNestedType(typeNode, propertyDeclaration, this.context, typeNode);

        let required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
        if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
            required = true;
        } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
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
        if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
            const indexMember = node.members.find((member) => member.kind === ts.SyntaxKind.IndexSignature);
            if (!indexMember) {
                return undefined;
            }

            const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
            const indexType = this.resolveNestedType(
                indexSignatureDeclaration.parameters[0].type as ts.TypeNode,
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
        type: ts.TypeReferenceNode | ts.ExpressionWithTypeArguments,
        targetEntity: ts.EntityName,
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
                let resolvedType: ts.TypeNode;

                // Argument may be a forward reference from context
                if (typeArg && ts.isTypeReferenceNode(typeArg) && ts.isIdentifier(typeArg.typeName) && context[typeArg.typeName.text]) {
                    resolvedType = context[typeArg.typeName.text];
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
        modelTypeDeclaration: Exclude<UsableDeclaration, ts.PropertySignature | ts.TypeAliasDeclaration | ts.EnumMember>,
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
                const baseEntityName = t.expression as ts.EntityName;

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

    private getNodeDescription(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
        return getNodeDescription(node, this.current.typeChecker);
    }

    private static getNodeFormat(
        node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration,
    ) {
        return getJSDocTagComment(node, JSDocTagName.FORMAT);
    }

    private getNodeExample(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) {
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

    protected getNodeExtensions(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) : Extension[] {
        return getNodeExtensions(node, this.current.decoratorResolver);
    }
}
