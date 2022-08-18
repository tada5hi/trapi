/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Node, SyntaxKind } from 'typescript';
import { getNodeDecorators } from '../../../src';

describe('src/decorator/utils/node.ts', () => {
    const fakeNode : Record<string, any> = {
        decorators: [
            {
                expression: {
                    kind: SyntaxKind.CallExpression,
                    arguments: [
                        {
                            kind: SyntaxKind.StringLiteral,
                            text: 'foo',
                        },
                        {
                            kind: SyntaxKind.NumericLiteral,
                            text: 0,
                        },
                    ],
                    typeArguments: [],
                    expression: {
                        text: 'MyText',
                    },
                },
            },
        ],
    };

    it('should get node decorators', () => {
        const decorators = getNodeDecorators(fakeNode as Node);

        expect(decorators).toBeDefined();
        expect(decorators.length).toEqual(1);
        expect(decorators[0].arguments.length).toEqual(2);
        expect(decorators[0].arguments).toEqual(['foo', 0]);

        expect(decorators[0].typeArguments.length).toEqual(0);
        expect(decorators[0].typeArguments).toEqual([]);
    });
});
