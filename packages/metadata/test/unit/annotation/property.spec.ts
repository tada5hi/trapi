/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ArrayLiteralExpression, Expression, NodeArray } from 'typescript';
import { NodeFlags, SyntaxKind } from 'typescript';
import type { AnnotationRepresentation, NodeDecorator } from '../../../src';
import {
    AnnotationKey, AnnotationPropertyManager, mergeObjectArguments,
} from '../../../src';

describe('src/decorator/representation/index.ts', () => {
    const swaggerTagsRepresentation : AnnotationRepresentation<`${AnnotationKey.SWAGGER_TAGS}`> = {
        key: `${AnnotationKey.SWAGGER_TAGS}`,
        id: 'SwaggerTags',
        properties: {
            value: {
                srcArgumentType: 'argument',
                type: 'array',
                srcAmount: -1,
                srcStrategy: 'merge',
            },
        },
    };

    const swaggerTagsDecorators : NodeDecorator[] = [
        { text: 'SwaggerTags', arguments: [['auth', 'admin']], typeArguments: [] },
        { text: 'SwaggerTags', arguments: [['auth'], ['admin']], typeArguments: [] },
        { text: 'SwaggerTags', arguments: [], typeArguments: [] },
    ];

    const swaggerTagsRepresentationManager = new AnnotationPropertyManager(swaggerTagsRepresentation, swaggerTagsDecorators);

    // ----------------------------------------------------------------------------------

    const responseExampleRepresentation : AnnotationRepresentation<`${AnnotationKey.RESPONSE_EXAMPLE}`> = {
        key: `${AnnotationKey.RESPONSE_EXAMPLE}`,
        id: 'ResponseExample',
        properties: {
            type: {
                isType: true,
                srcArgumentType: 'typeArgument',
                srcStrategy: 'none',
            },
            payload: {
                srcArgumentType: 'argument',
                srcAmount: -1,
                srcStrategy: (items: unknown[] | unknown[][]) => mergeObjectArguments(items),
            },
        },
    };

    const responseExampleDecorators : NodeDecorator[] = [
        { text: 'ResponseExample', arguments: [{ foo: 'bar' }], typeArguments: [{ foo: 'bar' }] },
        { text: 'ResponseExample', arguments: [{ foo: 'bar' }, { bar: 'baz' }], typeArguments: [] },
    ];

    const responseExampleRepresentationManager = new AnnotationPropertyManager(responseExampleRepresentation, responseExampleDecorators);

    it('should get property value', () => {
        let value = swaggerTagsRepresentationManager.getPropertyValue('value');
        expect(value).toEqual(['auth', 'admin']);

        value = swaggerTagsRepresentationManager.getPropertyValue('value', 1);
        expect(value).toEqual(['auth', 'admin']);

        let payloadValue = responseExampleRepresentationManager.getPropertyValue('payload');
        expect(payloadValue).toEqual({ foo: 'bar' });

        payloadValue = responseExampleRepresentationManager.getPropertyValue('type');
        expect(payloadValue).toEqual({ foo: 'bar' });

        payloadValue = responseExampleRepresentationManager.getPropertyValue('payload', 1);
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

        const manager = new AnnotationPropertyManager(swaggerTagsRepresentation, [
            { text: 'SwaggerTags', arguments: [arrayLiteralExpression], typeArguments: [] },
        ]);

        const value = manager.getPropertyValue('value');
        expect(value).toEqual(['auth', 'admin']);
    });

    it('should not get property value', () => {
        let value = swaggerTagsRepresentationManager.getPropertyValue('value', 2);
        expect(value).toEqual([]);

        value = swaggerTagsRepresentationManager.getPropertyValue('value', 3);
        expect(value).toBeUndefined();
    });
});
