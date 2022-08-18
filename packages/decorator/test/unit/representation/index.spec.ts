/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    ArrayLiteralExpression, Expression, NodeArray, NodeFlags, SyntaxKind,
} from 'typescript';
import {
    Data, Representation, RepresentationManager, mergeObjectArguments,
} from '../../../src';

describe('src/decorator/representation/index.ts', () => {
    const swaggerTagsRepresentation : Representation<'SWAGGER_TAGS'> = {
        id: 'SwaggerTags',
        properties: {
            DEFAULT: {
                srcArgumentType: 'argument',
                type: 'array',
                srcAmount: -1,
                srcStrategy: 'merge',
            },
        },
    };

    const swaggerTagsDecorators : Data[] = [
        { text: 'SwaggerTags', arguments: [['auth', 'admin']], typeArguments: [] },
        { text: 'SwaggerTags', arguments: [['auth'], ['admin']], typeArguments: [] },
        { text: 'SwaggerTags', arguments: [], typeArguments: [] },
    ];

    const swaggerTagsRepresentationManager = new RepresentationManager<'SWAGGER_TAGS'>(swaggerTagsRepresentation, swaggerTagsDecorators);

    // ----------------------------------------------------------------------------------

    const responseExampleRepresentation : Representation<'RESPONSE_EXAMPLE'> = {
        id: 'ResponseExample',
        properties: {
            TYPE: {
                isType: true,
                srcArgumentType: 'typeArgument',
                srcStrategy: 'none',
            },
            PAYLOAD: {
                srcArgumentType: 'argument',
                srcAmount: -1,
                srcStrategy: (items: unknown[] | unknown[][]) => mergeObjectArguments(items),
            },
        },
    };

    const responseExampleDecorators : Data[] = [
        { text: 'ResponseExample', arguments: [{ foo: 'bar' }], typeArguments: [{ foo: 'bar' }] },
        { text: 'ResponseExample', arguments: [{ foo: 'bar' }, { bar: 'baz' }], typeArguments: [] },
    ];

    const responseExampleRepresentationManager = new RepresentationManager<'RESPONSE_EXAMPLE'>(responseExampleRepresentation, responseExampleDecorators);

    it('should get property value', () => {
        let value = swaggerTagsRepresentationManager.getPropertyValue('DEFAULT');
        expect(value).toEqual(['auth', 'admin']);

        value = swaggerTagsRepresentationManager.getPropertyValue('DEFAULT', 1);
        expect(value).toEqual(['auth', 'admin']);

        let payloadValue = responseExampleRepresentationManager.getPropertyValue('PAYLOAD');
        expect(payloadValue).toEqual({ foo: 'bar' });

        payloadValue = responseExampleRepresentationManager.getPropertyValue('TYPE');
        expect(payloadValue).toEqual({ foo: 'bar' });

        payloadValue = responseExampleRepresentationManager.getPropertyValue('PAYLOAD', 1);
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

        const manager = new RepresentationManager<'SWAGGER_TAGS'>(swaggerTagsRepresentation, [
            { text: 'SwaggerTags', arguments: [arrayLiteralExpression], typeArguments: [] },
        ]);

        const value = manager.getPropertyValue('DEFAULT');
        expect(value).toEqual(['auth', 'admin']);
    });

    it('should not get property value', () => {
        let value = swaggerTagsRepresentationManager.getPropertyValue('DEFAULT', 2);
        expect(value).toEqual([]);

        value = swaggerTagsRepresentationManager.getPropertyValue('DEFAULT', 3);
        expect(value).toBeUndefined();
    });
});
