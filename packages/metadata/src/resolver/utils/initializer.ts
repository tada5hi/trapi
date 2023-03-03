/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import type { TypeVariant } from '..';
import { hasOwnProperty } from '../../utils';

export function getInitializerValue(
    initializer?: ts.Expression,
    typeChecker?: ts.TypeChecker,
    type?: TypeVariant,
) : unknown {
    if (!initializer) {
        return undefined;
    }

    switch (initializer.kind) {
        case ts.SyntaxKind.ArrayLiteralExpression: {
            const arrayLiteral = initializer as ts.ArrayLiteralExpression;
            return arrayLiteral.elements.map((element) => getInitializerValue(element, typeChecker));
        }
        case ts.SyntaxKind.StringLiteral:
        case ts.SyntaxKind.NoSubstitutionTemplateLiteral:
            return (initializer as ts.StringLiteral).text;
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.PrefixUnaryExpression: {
            const prefixUnary = initializer as ts.PrefixUnaryExpression;
            switch (prefixUnary.operator) {
                case ts.SyntaxKind.PlusToken:
                    return Number((prefixUnary.operand as ts.NumericLiteral).text);
                case ts.SyntaxKind.MinusToken:
                    return Number(`-${(prefixUnary.operand as ts.NumericLiteral).text}`);
                default:
                    throw new Error(`Unsupported prefix operator token: ${prefixUnary.operator}`);
            }
        }
        case ts.SyntaxKind.NumberKeyword:
        case ts.SyntaxKind.FirstLiteralToken:
            return Number((initializer as ts.NumericLiteral).text);
        case ts.SyntaxKind.NewExpression: {
            const newExpression = initializer as ts.NewExpression;
            const ident = newExpression.expression as ts.Identifier;

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
        case ts.SyntaxKind.NullKeyword: {
            return null;
        }
        case ts.SyntaxKind.ObjectLiteralExpression: {
            const objectLiteral = initializer as ts.ObjectLiteralExpression;
            const nestedObject: any = {};
            objectLiteral.properties.forEach((p: any) => {
                nestedObject[p.name.text] = getInitializerValue(p.initializer, typeChecker);
            });
            return nestedObject;
        }
        case ts.SyntaxKind.ImportSpecifier: {
            if (typeof typeChecker === 'undefined') {
                return undefined;
            }

            const importSpecifier = (initializer as any) as ts.ImportSpecifier;
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

            const symbol = typeChecker.getSymbolAtLocation(initializer);
            return getInitializerValue(
                extractInitializer(symbol.valueDeclaration) || extractInitializer(extractImportSpecifier(symbol)),
                typeChecker,
            );
        }
    }
}

export const hasInitializer = (
    node: ts.Node,
): node is ts.HasInitializer => Object.prototype.hasOwnProperty.call(node, 'initializer');
const extractInitializer = (
    valueDeclaration?: ts.Declaration,
) => (valueDeclaration && hasInitializer(valueDeclaration) && (valueDeclaration.initializer as ts.Expression)) || undefined;
const extractImportSpecifier = (
    symbol?: ts.Symbol,
) => (symbol?.declarations && symbol.declarations.length > 0 && ts.isImportSpecifier(symbol.declarations[0]) && symbol.declarations[0]) || undefined;
