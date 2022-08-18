/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Node, isCallExpression, isNumericLiteral, isStringLiteral,
} from 'typescript';
import { Data } from '../types';

/**
 * Get Decorators for a specific node.
 *
 * @param node
 * @param isMatching
 */
export function getNodeDecorators(
    node: Node,
    isMatching?: (data: Data) => boolean,
): Data[] {
    const { decorators } = node;
    if (!decorators || !decorators.length) {
        return [];
    }

    const items = decorators
        .map((d) => {
            const result: any = {
                arguments: [],
                typeArguments: [],
            };

            let x: any = d.expression;

            if (isCallExpression(x)) {
                if (x.arguments) {
                    result.arguments = x.arguments.map((argument: any) => {
                        if (isStringLiteral(argument) || isNumericLiteral(argument)) {
                            return argument.text;
                        }
                        return argument;
                    });
                }

                if (x.typeArguments) {
                    result.typeArguments = x.typeArguments;
                }

                x = x.expression;
            }

            result.text = x.text || x.name.text;

            return result as Data;
        });

    return typeof isMatching === 'undefined' ? items : items.filter(isMatching);
}
