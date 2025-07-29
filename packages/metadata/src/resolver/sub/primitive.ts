/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node, TypeNode } from 'typescript';
import { SyntaxKind } from 'typescript';
import type { DecoratorResolver } from '../../decorator';
import { DecoratorID } from '../../decorator';
import { getJSDocTagNames } from '../../utils';
import { TypeName } from '../constants';
import type { PrimitiveType, VoidType } from '../type';

export class PrimitiveResolver {
    protected decoratorResolver : DecoratorResolver;

    constructor(decoratorResolver: DecoratorResolver) {
        this.decoratorResolver = decoratorResolver;
    }

    resolve(node: TypeNode, parentNode?: Node) : PrimitiveType | VoidType | undefined {
        const resolved = this.resolveSyntaxKind(node.kind);
        if (resolved) {
            if (resolved === 'string') {
                return {
                    typeName: TypeName.STRING,
                };
            }

            if (resolved === 'void') {
                return {
                    typeName: TypeName.VOID,
                };
            }

            if (resolved === 'boolean') {
                return {
                    typeName: TypeName.BOOLEAN,
                };
            }

            if (resolved === 'undefined') {
                return {
                    typeName: TypeName.UNDEFINED,
                };
            }

            if (resolved === 'null') {
                // todo: check
                return undefined;
            }

            if (resolved === 'bigint') {
                return {
                    typeName: TypeName.BIGINT,
                };
            }

            if (resolved === 'number') {
                if (!parentNode) {
                    return {
                        typeName: TypeName.DOUBLE,
                    };
                }

                const lookupTags = [
                    'isInt',
                    'isLong',
                    'isFloat',
                    'isDouble',
                ];

                const tags = getJSDocTagNames(parentNode)
                    .filter((name) => lookupTags.some((m) => m.toLowerCase() === name.toLowerCase()))
                    .map((name) => name.toLowerCase());

                const decoratorIds = [
                    DecoratorID.IS_INT,
                    DecoratorID.IS_LONG,
                    DecoratorID.IS_FLOAT,
                    DecoratorID.IS_DOUBLE,
                ];

                let decoratorID : DecoratorID | undefined;

                for (let i = 0; i < decoratorIds.length; i++) {
                    const decorator = this.decoratorResolver.match(decoratorIds[i], parentNode);
                    if (decorator) {
                        decoratorID = decoratorIds[i];
                        break;
                    }
                }

                if (!decoratorID && tags.length === 0) {
                    return { typeName: TypeName.DOUBLE };
                }

                switch (decoratorID || tags[0]) {
                    case DecoratorID.IS_INT:
                    case 'isint':
                        return { typeName: TypeName.INTEGER };
                    case DecoratorID.IS_LONG:
                    case 'islong':
                        return { typeName: TypeName.LONG };
                    case DecoratorID.IS_FLOAT:
                    case 'isfloat':
                        return { typeName: TypeName.FLOAT };
                    case DecoratorID.IS_DOUBLE:
                    case 'isdouble':
                        return { typeName: TypeName.DOUBLE };
                    default:
                        return { typeName: TypeName.DOUBLE };
                }
            }
        }

        return undefined;
    }

    resolveSyntaxKind(syntaxKind: SyntaxKind) {
        switch (syntaxKind) {
            case SyntaxKind.StringKeyword:
                return 'string';
            case SyntaxKind.BooleanKeyword:
                return 'boolean';
            case SyntaxKind.VoidKeyword:
                return 'void';
            case SyntaxKind.UndefinedKeyword:
                return 'undefined';
            case SyntaxKind.NullKeyword:
                return 'null';
            case SyntaxKind.NumberKeyword:
                return 'number';
            case SyntaxKind.BigIntKeyword:
                return 'bigint';
            default:
                return undefined;
        }
    }
}
