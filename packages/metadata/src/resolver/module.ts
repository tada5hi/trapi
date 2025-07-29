/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { DecoratorID } from '../decorator';
import type { MetadataGenerator } from '../generator';
import { TypeName, UtilityTypeName } from './constants';

import type { Extension } from './extension';
import {
    JSDocTagName,
    getDeclarationValidators,
    getInitializerValue,
    getJSDocTagComment,
    getJSDocTagNames,
    hasJSDocTag, hasOwnProperty,
} from '../utils';
import { ResolverError } from './error';
import { getNodeExtensions } from './extension';
import { ResolverBase } from './sub/base';
import { PrimitiveResolver } from './sub/primitive';
import {
    isNestedObjectLiteralType, isRefAliasType, isRefObjectType, isStringType,
} from './type';
import type {
    AnyType,
    ArrayType,
    BufferType,
    DateTimeType,
    DateType,
    EnumType,
    IntersectionType,
    NestedObjectLiteralType,
    RefEnumType,
    ReferenceType,
    ResolverProperty,
    Type,
    UnionType,
} from './type';

const localReferenceTypeCache: { [typeName: string]: ReferenceType } = {};
const inProgressTypes: { [typeName: string]: boolean } = {};

type OverrideToken = ts.Token<ts.SyntaxKind.QuestionToken> |
ts.Token<ts.SyntaxKind.PlusToken> |
ts.Token<ts.SyntaxKind.MinusToken>;

type UsableDeclaration = ts.InterfaceDeclaration |
ts.ClassDeclaration |
ts.PropertySignature |
ts.TypeAliasDeclaration |
ts.EnumMember;

interface TypeNodeResolverContext {
    [name: string]: ts.TypeReferenceNode | ts.TypeNode;
}

export interface UtilityTypeOptions {
    keys: Array<string | number | boolean>;
}

export class TypeNodeResolver extends ResolverBase {
    private readonly typeNode : ts.TypeNode;

    private readonly current: MetadataGenerator;

    private readonly parentNode?: ts.Node;

    private context: TypeNodeResolverContext;

    private readonly referencer : ts.TypeNode | undefined;

    private readonly primitiveResolver : PrimitiveResolver;

    constructor(
        typeNode: ts.TypeNode,
        current: MetadataGenerator,
        parentNode?: ts.Node,
        context?: TypeNodeResolverContext,
        referencer?: ts.TypeNode,
    ) {
        super();

        this.typeNode = typeNode;
        this.current = current;
        this.parentNode = parentNode;
        this.context = context || {};
        this.referencer = referencer;
        this.primitiveResolver = new PrimitiveResolver(current.decoratorResolver);
    }

    public static clearCache() {
        Object.keys(localReferenceTypeCache).forEach((key) => {
            delete localReferenceTypeCache[key];
        });

        Object.keys(inProgressTypes).forEach((key) => {
            delete inProgressTypes[key];
        });
    }

    public resolve(): Type {
        const primitiveType = this.primitiveResolver.resolve(this.typeNode, this.parentNode);
        if (primitiveType) {
            return primitiveType;
        }

        if (this.typeNode.kind === ts.SyntaxKind.NullKeyword) {
            return {
                typeName: TypeName.ENUM,
                members: [null],
            };
        }

        if (ts.isArrayTypeNode(this.typeNode)) {
            return {
                typeName: TypeName.ARRAY,
                elementType: new TypeNodeResolver(
                    (this.typeNode as ts.ArrayTypeNode).elementType,
                    this.current,
                    this.parentNode,
                    this.context,
                ).resolve(),
            } as ArrayType;
        }

        if (ts.isUnionTypeNode(this.typeNode)) {
            const members = this.typeNode.types.map(
                (type) => new TypeNodeResolver(
                    type,
                    this.current,
                    this.parentNode,
                    this.context,
                ).resolve(),
            );

            return {
                typeName: TypeName.UNION,
                members,
            } as UnionType;
        }

        if (ts.isIntersectionTypeNode(this.typeNode)) {
            const members = this.typeNode.types.map(
                (type) => new TypeNodeResolver(
                    type,
                    this.current,
                    this.parentNode,
                    this.context,
                ).resolve(),
            );

            return {
                typeName: TypeName.INTERSECTION,
                members,
            } as IntersectionType;
        }

        if (
            this.typeNode.kind === ts.SyntaxKind.AnyKeyword ||
            this.typeNode.kind === ts.SyntaxKind.UnknownKeyword
        ) {
            return {
                typeName: TypeName.ANY,
            } as AnyType;
        }

        if (ts.isLiteralTypeNode(this.typeNode)) {
            return {
                typeName: TypeName.ENUM,
                members: [TypeNodeResolver.getLiteralValue(this.typeNode)],
            } as EnumType;
        }

        if (ts.isTypeLiteralNode(this.typeNode)) {
            const properties : ResolverProperty[] = this.typeNode.members
                .filter((member) => ts.isPropertySignature(member))
                .reduce((res, propertySignature: ts.PropertySignature) => {
                    const type = new TypeNodeResolver(
                        propertySignature.type as ts.TypeNode,
                        this.current,
                        propertySignature,
                        this.context,
                    ).resolve();

                    const property: ResolverProperty = {
                        deprecated: hasJSDocTag(propertySignature, JSDocTagName.DEPRECATED),
                        example: this.getNodeExample(propertySignature),
                        extensions: this.getNodeExtensions(propertySignature),
                        default: getJSDocTagComment(propertySignature, JSDocTagName.DEFAULT),
                        description: this.getNodeDescription(propertySignature),
                        format: TypeNodeResolver.getNodeFormat(propertySignature),
                        name: (propertySignature.name as ts.Identifier).text,
                        required: !propertySignature.questionToken,
                        type,
                        validators: getDeclarationValidators(propertySignature) || {},
                    };

                    return [property, ...res];
                }, [] as ResolverProperty[]);

            const indexMember = this.typeNode.members.find(
                (member) => ts.isIndexSignatureDeclaration(member),
            );
            let additionalType: Type | undefined;

            if (indexMember) {
                const indexSignatureDeclaration = indexMember as ts.IndexSignatureDeclaration;
                const indexType = new TypeNodeResolver(
                    indexSignatureDeclaration.parameters[0].type as ts.TypeNode,
                    this.current,
                    this.parentNode,
                    this.context,
                ).resolve();

                if (!isStringType(indexType)) {
                    throw new ResolverError('Only string indexes are supported.', this.typeNode);
                }

                additionalType = new TypeNodeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
            }

            return {
                additionalProperties: indexMember && additionalType,
                typeName: TypeName.NESTED_OBJECT_LITERAL,
                properties,
            } as NestedObjectLiteralType;
        }

        if (
            this.typeNode.kind === ts.SyntaxKind.ObjectKeyword ||
            ts.isFunctionTypeNode(this.typeNode)
        ) {
            return { typeName: TypeName.OBJECT };
        }

        if (ts.isMappedTypeNode(this.typeNode) && this.referencer) {
            const type = this.current.typeChecker.getTypeFromTypeNode(this.referencer);
            const mappedTypeNode = this.typeNode;
            const { typeChecker } = this.current;
            const getDeclaration = (prop: ts.Symbol) => prop.declarations && (prop.declarations[0] as ts.Declaration | undefined);
            const isIgnored = (prop: ts.Symbol) => {
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
                // Ignore methods, getter, setter and @ignored props
                .filter((property) => isIgnored(property) === false)
                // Transform to property
                .map((property) => {
                    const propertyType = typeChecker.getTypeOfSymbolAtLocation(property, this.typeNode);
                    const declaration = getDeclaration(property) as
                        ts.PropertySignature |
                        ts.PropertyDeclaration |
                        ts.ParameterDeclaration |
                        undefined;

                    if (declaration && ts.isPropertySignature(declaration)) {
                        return { ...this.propertyFromSignature(declaration, mappedTypeNode.questionToken), name: property.getName() };
                    } if (declaration && (ts.isPropertyDeclaration(declaration) || ts.isParameter(declaration))) {
                        return { ...this.propertyFromDeclaration(declaration, mappedTypeNode.questionToken), name: property.getName() };
                    }

                    // Resolve default value, required and typeNode
                    let required = false;
                    const typeNode = this.current.typeChecker.typeToTypeNode(
                        propertyType,
                        undefined,
                        ts.NodeBuilderFlags.NoTruncation,
                    );
                    if (mappedTypeNode.questionToken && mappedTypeNode.questionToken.kind === ts.SyntaxKind.MinusToken) {
                        required = true;
                    } else if (mappedTypeNode.questionToken && mappedTypeNode.questionToken.kind === ts.SyntaxKind.QuestionToken) {
                        required = false;
                    }

                    // Push property
                    return {
                        name: property.getName(),
                        required,
                        deprecated: false,
                        type: new TypeNodeResolver(typeNode, this.current, this.typeNode, this.context, this.referencer).resolve(),
                        validators: {},
                    };
                });

            return {
                typeName: TypeName.NESTED_OBJECT_LITERAL,
                properties,
            };
        }

        if (
            ts.isConditionalTypeNode(this.typeNode) &&
            this.referencer &&
            ts.isTypeReferenceNode(this.referencer)
        ) {
            const type = this.current.typeChecker.getTypeFromTypeNode(this.referencer);

            if (type.aliasSymbol) {
                let declaration = type.aliasSymbol.declarations[0] as ts.TypeAliasDeclaration | ts.EnumDeclaration | ts.DeclarationStatement;
                if (declaration.name) {
                    declaration = this.getModelTypeDeclaration(
                        declaration.name as ts.EntityName,
                    ) as ts.TypeAliasDeclaration |
                    ts.EnumDeclaration |
                    ts.DeclarationStatement;
                }

                const name = TypeNodeResolver.getRefTypeName(this.referencer.getText());
                return this.handleCachingAndCircularReferences(name, () => {
                    if (ts.isTypeAliasDeclaration(declaration)) {
                        // Note: I don't understand why typescript lose type for `this.referencer` (from above with isTypeReferenceNode())
                        return this.getTypeAliasReference(
                            declaration,
                            this.current.typeChecker.typeToString(type),
                            this.referencer as ts.TypeReferenceNode,
                        );
                    } if (ts.isEnumDeclaration(declaration)) {
                        return this.getEnumerateType(declaration.name) as RefEnumType;
                    }
                    throw new ResolverError(
                        `Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. We found an aliasSymbol and it's declaration was of kind ${declaration.kind}`,
                        this.typeNode,
                    );
                });
            } if (type.isClassOrInterface()) {
                let declaration = type.symbol.declarations[0] as ts.InterfaceDeclaration | ts.ClassDeclaration;
                if (declaration.name) {
                    declaration = this.getModelTypeDeclaration(declaration.name) as ts.InterfaceDeclaration | ts.ClassDeclaration;
                }
                const name = TypeNodeResolver.getRefTypeName(this.referencer.getText());
                return this.handleCachingAndCircularReferences(name, () => this.getModelReference(
                    declaration,
                    this.current.typeChecker.typeToString(type),
                ));
            }
            try {
                return new TypeNodeResolver(
                    this.current.typeChecker.typeToTypeNode(
                        type,
                        undefined,
                        ts.NodeBuilderFlags.NoTruncation,
                    ),
                    this.current,
                    this.typeNode,
                    this.context,
                    this.referencer,
                ).resolve();
            } catch {
                throw new ResolverError(
                    `Couldn't resolve Conditional to TypeNode. If you think this should be resolvable, please file an Issue. The flags on the result of the ConditionalType was ${type.flags}`,
                    this.typeNode,
                );
            }
        }

        if (ts.isTypeOperatorNode(this.typeNode)) {
            if (this.typeNode.operator === ts.SyntaxKind.KeyOfKeyword) {
                const type = this.current.typeChecker.getTypeFromTypeNode(this.typeNode);
                try {
                    return new TypeNodeResolver(
                        this.current.typeChecker.typeToTypeNode(
                            type,
                            undefined,
                            ts.NodeBuilderFlags.NoTruncation,
                        ),
                        this.current,
                        this.typeNode,
                        this.context,
                        this.referencer,
                    ).resolve();
                } catch (err) {
                    const indexedTypeName = this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.type));
                    throw new ResolverError(`Could not determine the keys on ${indexedTypeName}`, this.typeNode);
                }
            }

            if (this.typeNode.operator === ts.SyntaxKind.ReadonlyKeyword) {
                return new TypeNodeResolver(this.typeNode.type, this.current, this.typeNode, this.context, this.referencer).resolve();
            }
        }

        if (
            ts.isIndexedAccessTypeNode(this.typeNode) &&
            (
                this.typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword ||
                this.typeNode.indexType.kind === ts.SyntaxKind.StringKeyword
            )
        ) {
            const numberIndexType = this.typeNode.indexType.kind === ts.SyntaxKind.NumberKeyword;
            const objectType = this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType);
            const type = numberIndexType ? objectType.getNumberIndexType() : objectType.getStringIndexType();
            if (type === undefined) {
                throw new ResolverError(`Could not determine ${numberIndexType ? 'number' : 'string'} index on ${this.current.typeChecker.typeToString(objectType)}`, this.typeNode);
            }
            return new TypeNodeResolver(
                this.current.typeChecker.typeToTypeNode(type, undefined, undefined),
                this.current,
                this.typeNode,
                this.context,
                this.referencer,
            ).resolve();
        }

        if (
            ts.isIndexedAccessTypeNode(this.typeNode) &&
            ts.isLiteralTypeNode(this.typeNode.indexType) &&
            (
                ts.isStringLiteral(this.typeNode.indexType.literal) ||
                ts.isNumericLiteral(this.typeNode.indexType.literal)
            )
        ) {
            const hasType = (node: ts.Node | undefined): node is ts.HasType => node !== undefined &&
                Object.prototype.hasOwnProperty.call(node, 'type');

            const symbol = this.current.typeChecker.getPropertyOfType(
                this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType),
                this.typeNode.indexType.literal.text,
            );
            if (symbol === undefined) {
                throw new ResolverError(
                    `Could not determine the keys on ${this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode.objectType))}`,
                    this.typeNode,
                );
            }
            if (hasType(symbol.valueDeclaration) && symbol.valueDeclaration.type) {
                return new TypeNodeResolver(symbol.valueDeclaration.type, this.current, this.typeNode, this.context, this.referencer).resolve();
            }
            const declaration = this.current.typeChecker.getTypeOfSymbolAtLocation(symbol, this.typeNode.objectType);
            try {
                return new TypeNodeResolver(
                    this.current.typeChecker.typeToTypeNode(declaration, undefined, undefined),
                    this.current,
                    this.typeNode,
                    this.context,
                    this.referencer,
                ).resolve();
            } catch {
                throw new ResolverError(
                    `Could not determine the keys on ${this.current.typeChecker.typeToString(
                        this.current.typeChecker.getTypeFromTypeNode(
                            this.current.typeChecker.typeToTypeNode(declaration, undefined, undefined),
                        ),
                    )}`,
                    this.typeNode,
                );
            }
        }

        if (this.typeNode.kind === ts.SyntaxKind.TemplateLiteralType) {
            const type = this.current.typeChecker.getTypeFromTypeNode(this.referencer || this.typeNode);
            if (type.isUnion() && type.types.every((unionElementType) => unionElementType.isStringLiteral())) {
                return {
                    typeName: TypeName.ENUM,
                    members: type.types.map((stringLiteralType: ts.StringLiteralType) => stringLiteralType.value),
                } as EnumType;
            }

            throw new ResolverError(`Could not the type of ${this.current.typeChecker.typeToString(this.current.typeChecker.getTypeFromTypeNode(this.typeNode), this.typeNode)}`, this.typeNode);
        }

        if (ts.isParenthesizedTypeNode(this.typeNode)) {
            return new TypeNodeResolver(this.typeNode.type, this.current, this.typeNode, this.context, this.referencer).resolve();
        }

        if (this.typeNode.kind !== ts.SyntaxKind.TypeReference) {
            throw new ResolverError(`Unknown type: ${ts.SyntaxKind[this.typeNode.kind]}`, this.typeNode);
        }

        const typeReference = this.typeNode as ts.TypeReferenceNode;

        if (typeReference.typeName.kind === ts.SyntaxKind.Identifier) {
            // Special Utility Type
            if (typeReference.typeName.text === 'Record') {
                return {
                    additionalProperties: new TypeNodeResolver(typeReference.typeArguments[1], this.current, this.parentNode, this.context).resolve(),
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
                    elementType: new TypeNodeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.context).resolve(),
                };
            }

            if (
                typeReference.typeName.text === 'Promise' &&
                typeReference.typeArguments &&
                typeReference.typeArguments.length === 1
            ) {
                return new TypeNodeResolver(typeReference.typeArguments[0], this.current, this.parentNode, this.context).resolve();
            }

            if (typeReference.typeName.text === 'String') {
                return { typeName: TypeName.STRING };
            }

            if (this.context[typeReference.typeName.text]) {
                return new TypeNodeResolver(this.context[typeReference.typeName.text], this.current, this.parentNode, this.context).resolve();
            }
        }

        const referenceType = this.getReferenceType(typeReference);

        this.current.addReferenceType(referenceType);
        return referenceType;
    }

    // ------------------------------------------------------------------------
    // Utility Type(s)
    // ------------------------------------------------------------------------
    private static toUtilityType(
        typeName: string | ts.Identifier | undefined,
    ) : undefined | `${UtilityTypeName}` {
        if (typeof typeName === 'undefined') {
            return undefined;
        }

        const values : string[] = Object.values(UtilityTypeName);
        const index = values.indexOf(typeof typeName !== 'string' ? typeName.text : typeName);
        if (index === -1) {
            return undefined;
        }

        return values[index] as UtilityTypeName;
    }

    private static getUtilityTypeOptions(typeArguments: ts.NodeArray<ts.TypeNode>) {
        const utilityOptions : UtilityTypeOptions = {
            keys: [],
        };

        if (typeArguments.length >= 2) {
            if (ts.isUnionTypeNode(typeArguments[1])) {
                const args : ts.NodeArray<ts.TypeNode> = (typeArguments[1] as ts.UnionTypeNode).types;
                for (let i = 0; i < args.length; i++) {
                    if (ts.isLiteralTypeNode(args[i])) {
                        utilityOptions.keys.push(TypeNodeResolver.getLiteralValue(args[i] as ts.LiteralTypeNode));
                    }
                }
            }

            if (ts.isLiteralTypeNode(typeArguments[1])) {
                utilityOptions.keys.push(TypeNodeResolver.getLiteralValue(typeArguments[1] as ts.LiteralTypeNode));
            }
        }

        return utilityOptions;
    }

    private filterUtilityProperties<T extends Record<'name' | string, any>>(
        properties: T[],
        utilityType?: `${UtilityTypeName}`,
        utilityOptions?: UtilityTypeOptions,
    ) : T[] {
        if (typeof utilityType === 'undefined' || typeof utilityOptions === 'undefined') {
            return properties;
        }

        return properties
            .filter((property) => {
                const name : string = typeof property.name !== 'string' ? (property.name as ts.Identifier).text : property.name;

                switch (utilityType) {
                    case UtilityTypeName.PICK:
                        return utilityOptions.keys.indexOf(name) !== -1;
                    case UtilityTypeName.OMIT:
                        return utilityOptions.keys.indexOf(name) === -1;
                }

                return true;
            })
            .map((property) => {
                if (hasOwnProperty(property, 'required')) {
                    switch (utilityType) {
                        case UtilityTypeName.PARTIAL:
                            property.required = false;
                            break;
                        case UtilityTypeName.REQUIRED:
                        case UtilityTypeName.NON_NULLABLE:
                            property.required = true;
                            break;
                    }
                }

                return property;
            });
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

    private static getLiteralValue(typeNode: ts.LiteralTypeNode): string | number | boolean | null {
        let value: boolean | number | string | null;
        switch (typeNode.literal.kind) {
            case ts.SyntaxKind.TrueKeyword:
                value = true;
                break;
            case ts.SyntaxKind.FalseKeyword:
                value = false;
                break;
            case ts.SyntaxKind.StringLiteral:
                value = typeNode.literal.text;
                break;
            case ts.SyntaxKind.NumericLiteral:
                value = parseFloat(typeNode.literal.text);
                break;
            case ts.SyntaxKind.NullKeyword:
                value = null;
                break;
            default:
                if (Object.prototype.hasOwnProperty.call(typeNode.literal, 'text')) {
                    value = (typeNode.literal as ts.LiteralExpression).text;
                } else {
                    throw new ResolverError(`Couldn't resolve literal node: ${typeNode.literal.getText()}`);
                }
        }
        return value;
    }

    private getDateType(parentNode?: ts.Node): DateType | DateTimeType {
        if (!parentNode) {
            return { typeName: TypeName.DATETIME };
        }
        const tags = getJSDocTagNames(parentNode).filter((name) => ['isDate', 'isDateTime'].some((m) => m === name));

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

    private static getDesignatedModels<T extends ts.Node>(nodes: T[], typeName: string): T[] {
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
                        return `'${String(TypeNodeResolver.getLiteralValue(arg))}'`;
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

        // Handle Utility Types
        const identifierName = (type as ts.Identifier).text;

        const utilityType = TypeNodeResolver.toUtilityType(identifierName);
        let utilityTypeOptions : UtilityTypeOptions | undefined;

        if (utilityType) {
            const { typeArguments } = type.parent as ts.TypeReferenceNode;
            if (ts.isTypeReferenceNode(typeArguments[0])) {
                type = (typeArguments[0] as ts.TypeReferenceNode).typeName;
            } else if (ts.isExpressionWithTypeArguments(typeArguments[0])) {
                type = (typeArguments[0] as ts.ExpressionWithTypeArguments).expression as ts.EntityName;
            } else {
                throw new ResolverError('Can\'t resolve Reference type.');
            }

            utilityTypeOptions = TypeNodeResolver.getUtilityTypeOptions(typeArguments);
        } else {
            this.typeArgumentsToContext(node, type, this.context);
        }

        try {
            const existingType = localReferenceTypeCache[name];
            if (existingType) {
                return existingType;
            }

            const refEnumType = this.getEnumerateType(type);
            if (refEnumType) {
                localReferenceTypeCache[name] = refEnumType;
                return refEnumType;
            }

            if (inProgressTypes[name]) {
                return this.createCircularDependencyResolver(name);
            }

            inProgressTypes[name] = true;

            const declaration = this.getModelTypeDeclaration(type);

            let referenceType: ReferenceType;
            if (ts.isTypeAliasDeclaration(declaration)) {
                referenceType = this.getTypeAliasReference(declaration, name, node, utilityType, utilityTypeOptions);
                localReferenceTypeCache[name] = referenceType;
                return referenceType;
            }

            if (ts.isEnumMember(declaration)) {
                referenceType = {
                    typeName: TypeName.REF_ENUM,
                    refName: TypeNodeResolver.getRefTypeName(name, utilityType),
                    members: [this.current.typeChecker.getConstantValue(declaration)],
                    memberNames: [declaration.name.getText()],
                    deprecated: hasJSDocTag(declaration, JSDocTagName.DEPRECATED),
                };

                localReferenceTypeCache[name] = referenceType;
                return referenceType;
            }

            // todo: dont cast handle property-signature
            referenceType = this.getModelReference(declaration as ts.InterfaceDeclaration, name, utilityType, utilityTypeOptions);
            localReferenceTypeCache[name] = referenceType;
            return referenceType;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`There was a problem resolving type of '${name}'.`);
            throw err;
        }
    }

    private getTypeAliasReference(
        declaration: ts.TypeAliasDeclaration,
        name: string,
        referencer: ts.TypeReferenceType,
        utilityType?: `${UtilityTypeName}`,
        utilityTypeOptions?: UtilityTypeOptions,
    ): ReferenceType {
        const refName = TypeNodeResolver.getRefTypeName(name, utilityType);

        if (declaration.type.kind === ts.SyntaxKind.TypeReference) {
            const referenceType = this.getReferenceType(declaration.type as ts.TypeReferenceNode);
            if (referenceType.refName === refName) {
                return referenceType;
            }
        }

        const type = new TypeNodeResolver(declaration.type, this.current, declaration, this.context, this.referencer || referencer).resolve();
        if (isNestedObjectLiteralType(type)) {
            type.properties = this.filterUtilityProperties(type.properties, utilityType, utilityTypeOptions);
        }

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
        utilityType?: `${UtilityTypeName}`,
        utilityOptions?: UtilityTypeOptions,
    ) : ReferenceType {
        const example = this.getNodeExample(modelType);
        const description : string = this.getNodeDescription(modelType);
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
                const implicitType = this.current.typeChecker.getReturnTypeOfSignature(signature);
                nodeType = this.current.typeChecker.typeToTypeNode(implicitType, undefined, ts.NodeBuilderFlags.NoTruncation) as ts.TypeNode;
            }

            return {
                refName: `${TypeNodeResolver.getRefTypeName(name, utilityType)}Alias`,
                typeName: TypeName.REF_ALIAS,
                description,
                type: new TypeNodeResolver(nodeType, this.current).resolve(),
                deprecated,
                validators: {},
                ...(example && { example }),
            };
        }

        const properties = this.getModelProperties(modelType, undefined, utilityType, utilityOptions);
        const additionalProperties = this.getModelAdditionalProperties(modelType);
        const inheritedProperties = this.getModelInheritedProperties(modelType) || [];

        const referenceType: ReferenceType & { properties: ResolverProperty[] } = {
            additionalProperties,
            typeName: TypeName.REF_OBJECT,
            description,
            properties: this.filterUtilityProperties(inheritedProperties, utilityType, utilityOptions),
            refName: TypeNodeResolver.getRefTypeName(name, utilityType),
            deprecated,
            ...(example && { example }),
        };

        referenceType.properties = referenceType.properties.concat(properties);

        return referenceType;
    }

    private static getRefTypeName(name: string, utilityType?: `${UtilityTypeName}`): string {
        return encodeURIComponent(
            name
                .replace(/<|>/g, '_')
                .replace(/\s+/g, '')
                .replace(/,/g, '.')
                .replace(/'([^']*)'/g, '$1')
                .replace(/"([^"]*)"/g, '$1')
                .replace(/&/g, typeof utilityType !== 'undefined' ? '--' : '-and-')
                .replace(/\|/g, typeof utilityType !== 'undefined' ? '--' : '-or-')
                .replace(/\[\]/g, '-array')
                .replace(/{|}/g, '_') // SuccessResponse_{indexesCreated-number}_ -> SuccessResponse__indexesCreated-number__
                .replace(/([a-z]+):([a-z]+)/gi, '$1-$2') // SuccessResponse_indexesCreated:number_ -> SuccessResponse_indexesCreated-number_
                .replace(/;/g, '--')
                .replace(/([a-z]+)\[([a-z]+)\]/gi, '$1-at-$2') // Partial_SerializedDatasourceWithVersion[format]_ -> Partial_SerializedDatasourceWithVersion~format~_,

                .replace(/_/g, '')
                .replace(/-/g, ''),
        );
    }

    private contextualizedName(name: string): string {
        return Object.entries(this.context).reduce((acc, [key, entry]) => acc
            .replace(new RegExp(`<\\s*([^>]*\\s)*\\s*(${key})(\\s[^>]*)*\\s*>`, 'g'), `<$1${entry.getText()}$3>`)
            .replace(new RegExp(`<\\s*([^,]*\\s)*\\s*(${key})(\\s[^,]*)*\\s*,`, 'g'), `<$1${entry.getText()}$3,`)
            .replace(new RegExp(`,\\s*([^>]*\\s)*\\s*(${key})(\\s[^>]*)*\\s*>`, 'g'), `,$1${entry.getText()}$3>`)
            .replace(new RegExp(`<\\s*([^<]*\\s)*\\s*(${key})(\\s[^<]*)*\\s*<`, 'g'), `<$1${entry.getText()}$3<`), name);
    }

    private handleCachingAndCircularReferences(name: string, declarationResolver: () => ReferenceType): ReferenceType {
        try {
            const existingType = localReferenceTypeCache[name];
            if (existingType) {
                return existingType;
            }

            if (inProgressTypes[name]) {
                return this.createCircularDependencyResolver(name);
            }

            inProgressTypes[name] = true;

            const reference = declarationResolver();

            localReferenceTypeCache[name] = reference;

            this.current.addReferenceType(reference);

            return reference;
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error(`There was a problem resolving type of '${name}'.`);
            throw err;
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
        utilityType?: `${UtilityTypeName}`,
        utilityOptions?: UtilityTypeOptions,
    ) : ResolverProperty[] {
        const isIgnored = (e: ts.TypeElement | ts.ClassElement) => hasJSDocTag(e, JSDocTagName.IGNORE);

        // Interface model
        if (ts.isInterfaceDeclaration(node)) {
            return node.members.filter((member) => !isIgnored(member) &&
                ts.isPropertySignature(member)).map(
                (member: ts.PropertySignature) => this.propertyFromSignature(member, overrideToken),
            );
        }

        // Class model
        let properties = node.members
            .filter((member) => !isIgnored(member) &&
                    member.kind === ts.SyntaxKind.PropertyDeclaration &&
                !this.hasStaticModifier(member) &&
                this.hasPublicModifier(member)) as Array<ts.PropertyDeclaration | ts.ParameterDeclaration>;

        const classConstructor = node.members.find((member) => ts.isConstructorDeclaration(member)) as ts.ConstructorDeclaration;

        if (classConstructor && classConstructor.parameters) {
            const constructorProperties = classConstructor.parameters.filter((parameter) => this.isAccessibleParameter(parameter));

            properties.push(...constructorProperties);
        }

        properties = this.filterUtilityProperties(properties, utilityType, utilityOptions);

        return properties.map((property) => this.propertyFromDeclaration(property, overrideToken, utilityType));
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
            type: new TypeNodeResolver(
                propertySignature.type,
                this.current,
                propertySignature.type.parent,
                this.context,
                propertySignature.type,
            ).resolve(),
            validators: getDeclarationValidators(propertySignature) || {},
        };
        return property;
    }

    private propertyFromDeclaration(
        propertyDeclaration: ts.PropertyDeclaration | ts.ParameterDeclaration,
        overrideToken?: OverrideToken,
        utilityType?: string,
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

        const type = new TypeNodeResolver(typeNode, this.current, propertyDeclaration, this.context, typeNode).resolve();

        let required = !propertyDeclaration.questionToken && !propertyDeclaration.initializer;
        if (overrideToken && overrideToken.kind === ts.SyntaxKind.MinusToken) {
            required = true;
        } else if (overrideToken && overrideToken.kind === ts.SyntaxKind.QuestionToken) {
            required = false;
        }

        if (typeof utilityType !== 'undefined') {
            if (utilityType === 'Partial') {
                required = false;
            }

            if (utilityType === 'Required') {
                required = true;
            }
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
            const indexType = new TypeNodeResolver(
                indexSignatureDeclaration.parameters[0].type as ts.TypeNode,
                this.current,
                this.parentNode,
                this.context,
            ).resolve();

            if (indexType.typeName !== 'string') {
                throw new ResolverError('Only string indexers are supported.', this.typeNode);
            }

            return new TypeNodeResolver(indexSignatureDeclaration.type, this.current, this.parentNode, this.context).resolve();
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
            for (let index = 0; index < typeParameters.length; index++) {
                const typeParameter = typeParameters[index];
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
        const symbol = this.current.typeChecker.getSymbolAtLocation(node.name as ts.Node);
        if (!symbol) {
            return undefined;
        }

        /**
         * TODO: Workaround for what seems like a bug in the compiler
         * Warrants more investigation and possibly a PR against typescript
         */
        if (node.kind === ts.SyntaxKind.Parameter) {
            // TypeScript won't parse jsdoc if the flag is 4, i.e. 'Property'
            symbol.flags = 0;
        }

        const comments = symbol.getDocumentationComment(this.current.typeChecker);
        if (comments.length) {
            return ts.displayPartsToString(comments);
        }

        return undefined;
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
                // do nothing
            }
        }

        return undefined;
    }

    protected getNodeExtensions(node: UsableDeclaration | ts.PropertyDeclaration | ts.ParameterDeclaration | ts.EnumDeclaration) : Extension[] {
        return getNodeExtensions(node, this.current.decoratorResolver);
    }
}
