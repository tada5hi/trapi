/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Node } from 'typescript';
import { ts } from '../../../core/compiler';
import type { NodeDecorator } from './types';

/**
 * Get Decorators for a specific node.
 *
 * @param node
 * @param isMatching
 */
export function getNodeDecorators(
    node: Node,
    isMatching?: (data: NodeDecorator) => boolean,
): NodeDecorator[] {
    if (!ts.canHaveDecorators(node)) {
        return [];
    }

    const decorators = ts.getDecorators(node);

    if (typeof decorators === 'undefined') {
        return [];
    }

    const items = decorators
        .map((d) => {
            const result: any = {
                arguments: [],
                typeArguments: [],
            };

            let x: any = d.expression;

            if (ts.isCallExpression(x)) {
                if (x.arguments) {
                    result.arguments = x.arguments.map((argument: any) => {
                        if (ts.isStringLiteral(argument) || ts.isNumericLiteral(argument)) {
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

            return result as NodeDecorator;
        });

    return typeof isMatching === 'undefined' ? items : items.filter(isMatching);
}
