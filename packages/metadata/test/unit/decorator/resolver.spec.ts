/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NodeDecorator } from '../../../src';
import { DecoratorID, DecoratorPropertyManager, DecoratorResolver } from '../../../src';

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

    const mapper = new DecoratorResolver();

    it('should not match', () => {
        expect(mapper.match(DecoratorID.RESPONSE_EXAMPLE, [])).toBeUndefined();
        expect(mapper.match(DecoratorID.RESPONSE_EXAMPLE, decorators)).toBeUndefined();
        expect(mapper.match(DecoratorID.RESPONSE_EXAMPLE, decoratorsWithResponseExample)).toBeUndefined();
        expect(mapper.match(DecoratorID.SWAGGER_TAGS, decorators)).toBeUndefined();
    });

    it('should work with preset swagger', () => {
        mapper.setup({ preset: '@trapi/preset-swagger' });

        expect(mapper.match(DecoratorID.SWAGGER_TAGS, decorators)).toBeDefined();
        expect(mapper.match(DecoratorID.RESPONSE_EXAMPLE, decorators)).toBeUndefined();
        expect(mapper.match(DecoratorID.RESPONSE_EXAMPLE, decoratorsWithResponseExample)).toBeDefined();
    });

    it('should work with preset typescript-rest', () => {
        const data = [...decorators, { text: 'Example', arguments: [], typeArguments: [] }];

        mapper.setup({ preset: '@trapi/preset-typescript-rest' });
        expect(mapper.match(DecoratorID.RESPONSE_EXAMPLE, data)).toBeDefined();
    });

    it('should match', () => {
        mapper.setup({
            decorators: [{
                id: DecoratorID.SWAGGER_TAGS,
                name: 'SwaggerTags',
                properties: {
                    value: {},
                },
            },
            ],
        });

        const match = mapper.match(DecoratorID.SWAGGER_TAGS, decorators);

        expect(match).toBeDefined();
        expect(match).toBeInstanceOf(DecoratorPropertyManager);
    });
});
