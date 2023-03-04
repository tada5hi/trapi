/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NodeDecorator } from '../../../src';
import { AnnotationKey, AnnotationPropertyManager, AnnotationResolver } from '../../../src';

describe('src/decorator/mapper/index.ts', () => {
    const decorators : NodeDecorator[] = [
        { text: 'foo', arguments: [], typeArguments: [] },
        { text: 'SwaggerTags', arguments: [], typeArguments: [] },
    ];

    const decoratorsWithResponseExample : NodeDecorator[] = [
        ...decorators,
        {
            text: 'ResponseExample',
            arguments: [],
            typeArguments: [],
        },
    ];

    const mapper = new AnnotationResolver();

    it('should not match', () => {
        expect(mapper.match(AnnotationKey.RESPONSE_EXAMPLE, [])).toBeUndefined();
        expect(mapper.match(AnnotationKey.RESPONSE_EXAMPLE, decorators)).toBeUndefined();
        expect(mapper.match(AnnotationKey.RESPONSE_EXAMPLE, decoratorsWithResponseExample)).toBeUndefined();
        expect(mapper.match(AnnotationKey.SWAGGER_TAGS, decorators)).toBeUndefined();
    });

    it('should work with preset built-in', () => {
        mapper.setup('@trapi/preset-built-in');

        expect(mapper.match(AnnotationKey.SWAGGER_TAGS, decorators)).toBeDefined();
        expect(mapper.match(AnnotationKey.RESPONSE_EXAMPLE, decorators)).toBeUndefined();
        expect(mapper.match(AnnotationKey.RESPONSE_EXAMPLE, decoratorsWithResponseExample)).toBeDefined();
    });

    it('should work with preset typescript-rest', () => {
        const data = [...decorators, { text: 'Example', arguments: [], typeArguments: [] }];

        mapper.setup('@trapi/preset-typescript-rest');
        expect(mapper.match(AnnotationKey.RESPONSE_EXAMPLE, data)).toBeDefined();
    });

    it('should match', () => {
        mapper.setup([{
            key: AnnotationKey.SWAGGER_TAGS,
            id: 'SwaggerTags',
            properties: {
                value: {},
            },
        },
        ]);

        const match = mapper.match(AnnotationKey.SWAGGER_TAGS, decorators);

        expect(match).toBeDefined();
        expect(match).toBeInstanceOf(AnnotationPropertyManager);
    });
});
