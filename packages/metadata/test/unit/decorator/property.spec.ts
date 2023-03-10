/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArrayLiteralExpression, Expression, NodeArray } from 'typescript';
import { NodeFlags, SyntaxKind } from 'typescript';
import type { DecoratorConfig, NodeDecorator } from '../../../src';
import {
    DecoratorID,
    DecoratorPropertyManager,
} from '../../../src';

describe('src/decorator/property/index.ts', () => {
    const swaggerTagsRepresentation : DecoratorConfig<`${DecoratorID.TAGS}`> = {
        id: `${DecoratorID.TAGS}`,
        name: 'SwaggerTags',
        properties: {
            value: {
                strategy: 'merge',
                amount: -1,
            },
        },
    };

    const swaggerTagsDecorators : NodeDecorator[] = [
        { text: 'SwaggerTags', arguments: [['auth', 'admin']], typeArguments: [] },
        { text: 'SwaggerTags', arguments: [['auth'], ['admin']], typeArguments: [] },
        { text: 'SwaggerTags', arguments: ['auth'], typeArguments: [] },
        { text: 'SwaggerTags', arguments: [], typeArguments: [] },
    ];

    const swaggerTagsRepresentationManager = new DecoratorPropertyManager(swaggerTagsRepresentation, swaggerTagsDecorators);

    // ----------------------------------------------------------------------------------

    const responseExampleRepresentation : DecoratorConfig<`${DecoratorID.EXAMPLE}`> = {
        id: `${DecoratorID.EXAMPLE}`,
        name: 'ResponseExample',
        properties: {
            type: {
                isType: true,
            },
            payload: {
                amount: -1,
                strategy: 'merge',
            },
        },
    };

    const responseExampleDecorators : NodeDecorator[] = [
        { text: 'ResponseExample', arguments: [{ foo: 'bar' }], typeArguments: [{ foo: 'bar' }] },
        { text: 'ResponseExample', arguments: [{ foo: 'bar' }, { bar: 'baz' }], typeArguments: [] },
    ];

    const responseExampleRepresentationManager = new DecoratorPropertyManager(responseExampleRepresentation, responseExampleDecorators);

    it('should get property value for swagger decorator', () => {
        let value = swaggerTagsRepresentationManager.get('value');
        expect(value).toEqual(['auth', 'admin']);

        value = swaggerTagsRepresentationManager.get('value', 1);
        expect(value).toEqual(['auth', 'admin']);

        value = swaggerTagsRepresentationManager.get('value', 2);
        expect(value).toEqual(['auth']);
    });

    it('should get property value for example decorator', () => {
        let payloadValue = responseExampleRepresentationManager.get('payload');
        expect(payloadValue).toEqual({ foo: 'bar' });

        payloadValue = responseExampleRepresentationManager.get('type');
        expect(payloadValue).toEqual({ foo: 'bar' });

        payloadValue = responseExampleRepresentationManager.get('payload', 1);
        expect(payloadValue).toEqual({ foo: 'bar', bar: 'baz' });
    });

    it('should get property value with array literal expression', () => {
        const arrayLiteralExpression : ArrayLiteralExpression = {
            kind: SyntaxKind.ArrayLiteralExpression,
            elements: [
                { text: 'auth', flags: NodeFlags.None, parent: undefined } as unknown as Expression,
                { text: 'admin', flags: NodeFlags.None, parent: undefined } as unknown as Expression,
            ] as unknown as NodeArray<Expression>,
        } as ArrayLiteralExpression;

        const manager = new DecoratorPropertyManager(swaggerTagsRepresentation, [
            { text: 'SwaggerTags', arguments: [arrayLiteralExpression], typeArguments: [] },
        ]);

        const value = manager.get('value');
        expect(value).toEqual(['auth', 'admin']);
    });

    it('should not get property value', () => {
        let value = swaggerTagsRepresentationManager.get('value', 3);
        expect(value).toBeUndefined();

        value = swaggerTagsRepresentationManager.get('value', 4);
        expect(value).toBeUndefined();
    });
});
