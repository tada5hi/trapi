/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as ts from 'typescript';
import { hasOwnProperty } from '@trapi/metadata-utils';
import { Resolver } from '../type';

export function getInitializerValue(
    initializer?: ts.Expression,
    typeChecker?: ts.TypeChecker,
    type?: Resolver.Type,
) : unknown {
    if (!initializer) {
        return undefined;
    }

    switch (initializer.kind) {
        case ts.SyntaxKind.ArrayLiteralExpression:
            const arrayLiteral = initializer as ts.ArrayLiteralExpression;
            return arrayLiteral.elements.map((element) => getInitializerValue(element, typeChecker));
        case ts.SyntaxKind.StringLiteral:
            return (initializer as ts.StringLiteral).text;
        case ts.SyntaxKind.TrueKeyword:
            return true;
        case ts.SyntaxKind.FalseKeyword:
            return false;
        case ts.SyntaxKind.NumberKeyword:
        case ts.SyntaxKind.FirstLiteralToken:
            return Number((initializer as ts.NumericLiteral).text);
        case ts.SyntaxKind.NewExpression:
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
            return;
        case ts.SyntaxKind.ObjectLiteralExpression:
            const objectLiteral = initializer as ts.ObjectLiteralExpression;
            const nestedObject: any = {};
            objectLiteral.properties.forEach((p: any) => {
                nestedObject[p.name.text] = getInitializerValue(p.initializer, typeChecker);
            });
            return nestedObject;
        default:
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
            const extractedInitializer = symbol && symbol.valueDeclaration && hasInitializer(symbol.valueDeclaration) && (symbol.valueDeclaration.initializer as ts.Expression);
            return extractedInitializer ? getInitializerValue(extractedInitializer, typeChecker) : undefined;
    }
}

export const hasInitializer = (node: ts.Node): node is ts.HasInitializer => node.hasOwnProperty('initializer');
