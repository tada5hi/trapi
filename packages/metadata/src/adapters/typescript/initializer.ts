/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SyntaxKind, isImportSpecifier } from 'typescript';
import type {
    ArrayLiteralExpression,
    Declaration,
    Expression,
    HasInitializer,
    Identifier,
    ImportSpecifier,
    NewExpression,
    Node,
    NumericLiteral,
    ObjectLiteralExpression,
    PrefixUnaryExpression,
    StringLiteral,
    Symbol as TsSymbol,
    TypeChecker,
} from 'typescript';
import { MetadataError } from '../../core/error';
import type { Type } from '@trapi/core';
import { hasOwnProperty } from '../../core/utils/object';

export function getInitializerValue(
    initializer?: Expression,
    typeChecker?: TypeChecker,
    type?: Type,
) : unknown {
    if (!initializer) {
        return undefined;
    }

    switch (initializer.kind) {
        case SyntaxKind.ArrayLiteralExpression: {
            const arrayLiteral = initializer as ArrayLiteralExpression;
            return arrayLiteral.elements.map((element) => getInitializerValue(element, typeChecker));
        }
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NoSubstitutionTemplateLiteral:
            return (initializer as StringLiteral).text;
        case SyntaxKind.TrueKeyword:
            return true;
        case SyntaxKind.FalseKeyword:
            return false;
        case SyntaxKind.PrefixUnaryExpression: {
            const prefixUnary = initializer as PrefixUnaryExpression;
            switch (prefixUnary.operator) {
                case SyntaxKind.PlusToken:
                    return Number((prefixUnary.operand as NumericLiteral).text);
                case SyntaxKind.MinusToken:
                    return Number(`-${(prefixUnary.operand as NumericLiteral).text}`);
                default:
                    throw new MetadataError(`Unsupported prefix operator token: ${prefixUnary.operator}`);
            }
        }
        case SyntaxKind.NumberKeyword:
        case SyntaxKind.FirstLiteralToken:
            return Number((initializer as NumericLiteral).text);
        case SyntaxKind.NewExpression: {
            const newExpression = initializer as NewExpression;
            const ident = newExpression.expression as Identifier;

            if (ident.text === 'Date') {
                let date = new Date();
                if (newExpression.arguments) {
                    const newArguments = newExpression.arguments.filter((args) => args.kind !== undefined);
                    const argsValue = newArguments.map((args) => getInitializerValue(args, typeChecker));
                    if (argsValue.length > 0) {
                        date = new Date(argsValue as any);
                    }
                }
                const dateString = date.toISOString();
                if (type && type.typeName === 'date') {
                    return dateString.split('T')[0];
                }

                return dateString;
            }

            return undefined;
        }
        case SyntaxKind.NullKeyword: {
            return null;
        }
        case SyntaxKind.ObjectLiteralExpression: {
            const objectLiteral = initializer as ObjectLiteralExpression;
            const nestedObject: any = {};
            objectLiteral.properties.forEach((p: any) => {
                nestedObject[p.name.text] = getInitializerValue(p.initializer, typeChecker);
            });
            return nestedObject;
        }
        case SyntaxKind.ImportSpecifier: {
            if (typeof typeChecker === 'undefined') {
                return undefined;
            }

            const importSpecifier = (initializer as any) as ImportSpecifier;
            const importSymbol = typeChecker.getSymbolAtLocation(importSpecifier.name);
            if (!importSymbol) {
                return undefined;
            }

            const aliasedSymbol = typeChecker.getAliasedSymbol(importSymbol);
            const declarations = aliasedSymbol.getDeclarations();
            const declaration = declarations && declarations.length > 0 ? declarations[0] : undefined;
            return getInitializerValue(extractInitializer(declaration), typeChecker);
        }
        default: {
            if (typeof initializer === 'undefined') {
                return undefined;
            }
            if (
                typeof initializer.parent === 'undefined' ||
                typeof typeChecker === 'undefined'
            ) {
                if (hasOwnProperty(initializer, 'text')) {
                    return initializer.text;
                }

                return undefined;
            }

            // Ask the checker before hand-walking declarations. It has already
            // constant-folded the shapes the walk below cannot follow: an import
            // alias (an `ImportSpecifier` has no `initializer` to extract), a
            // barrel re-export, and a template expression (which has no symbol
            // at all). The walk still runs second — the checker deliberately
            // widens `let x = '/a'` and `const x: string = '/a'` to `string`,
            // and those two the walk does resolve.
            const literalType = typeChecker.getTypeAtLocation(initializer);
            if (literalType.isStringLiteral() || literalType.isNumberLiteral()) {
                return literalType.value;
            }

            const symbol = typeChecker.getSymbolAtLocation(initializer);
            if (!symbol) {
                return undefined;
            }
            return getInitializerValue(
                extractInitializer(symbol.valueDeclaration) || extractInitializer(extractImportSpecifier(symbol)),
                typeChecker,
            );
        }
    }
}

export const hasInitializer = (
    node: Node,
): node is HasInitializer => Object.prototype.hasOwnProperty.call(node, 'initializer');
const extractInitializer = (
    valueDeclaration?: Declaration,
) => (valueDeclaration && hasInitializer(valueDeclaration) && (valueDeclaration.initializer as Expression)) || undefined;
const extractImportSpecifier = (
    symbol?: TsSymbol,
) => {
    const declaration = symbol?.declarations?.[0];
    return declaration && isImportSpecifier(declaration) ? declaration : undefined;
};
