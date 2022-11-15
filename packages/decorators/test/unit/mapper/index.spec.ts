/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Mapper, NodeDecorator, RepresentationManager } from '../../../src';

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

    const mapper = new Mapper({
        internal: false,
    });

    it('should not match', () => {
        expect(mapper.match('RESPONSE_EXAMPLE', [])).toBeUndefined();
        expect(mapper.match('RESPONSE_EXAMPLE', decorators)).toBeUndefined();
        expect(mapper.match('RESPONSE_EXAMPLE', decoratorsWithResponseExample)).toBeUndefined();
        expect(mapper.match('SWAGGER_TAGS', decorators)).toBeUndefined();
    });

    it('should work with internal configurations', () => {
        mapper.setConfig({
            internal: true,
        });

        expect(mapper.match('SWAGGER_TAGS', decorators)).toBeDefined();
        expect(mapper.match('RESPONSE_EXAMPLE', decorators)).toBeUndefined();
        expect(mapper.match('RESPONSE_EXAMPLE', decoratorsWithResponseExample)).toBeDefined();
    });

    it('should work with library configurations', () => {
        mapper.setConfig({ internal: false, preset: { 'typescript-rest': { RESPONSE_EXAMPLE: false } } });
        expect(mapper.match('RESPONSE_EXAMPLE', decoratorsWithResponseExample)).toBeUndefined();
        mapper.setConfig({ internal: false, preset: { 'typescript-rest': false } });
        expect(mapper.match('RESPONSE_EXAMPLE', decoratorsWithResponseExample)).toBeUndefined();
        mapper.setConfig({ internal: false, preset: { 'typescript-rest': [] } });
        expect(mapper.match('RESPONSE_EXAMPLE', decoratorsWithResponseExample)).toBeUndefined();
        mapper.setConfig({ internal: false, preset: { 'typescript-rest': 'SWAGGER_TAGS' } });
        expect(mapper.match('RESPONSE_EXAMPLE', decoratorsWithResponseExample)).toBeUndefined();

        const data = [...decorators, { text: 'Example', arguments: [], typeArguments: [] }];

        mapper.setConfig({ internal: false, preset: { 'typescript-rest': { RESPONSE_EXAMPLE: true } } });
        expect(mapper.match('RESPONSE_EXAMPLE', data)).toBeDefined();
        mapper.setConfig({ internal: false, preset: { 'typescript-rest': true } });
        expect(mapper.match('RESPONSE_EXAMPLE', data)).toBeDefined();
        mapper.setConfig({ internal: false, preset: { 'typescript-rest': ['RESPONSE_EXAMPLE'] } });
        expect(mapper.match('RESPONSE_EXAMPLE', data)).toBeDefined();
    });

    it('should match', () => {
        mapper.setConfig({
            custom: {
                SWAGGER_TAGS: {
                    id: 'SwaggerTags',
                    properties: {
                        DEFAULT: {},
                    },
                },
            },
        });

        const match = mapper.match('SWAGGER_TAGS', decorators);

        expect(match).toBeDefined();
        expect(match).toBeInstanceOf(RepresentationManager);
    });
});