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
        { text: 'Tags', arguments: [], typeArguments: [] },
    ];

    const decoratorsWithResponseExample : NodeDecorator[] = [
        ...decorators,
        {
            text: 'Example',
            arguments: [],
            typeArguments: [],
        },
    ];

    const mapper = new DecoratorResolver();

    it('should not match', () => {
        expect(mapper.match(DecoratorID.EXAMPLE, [])).toBeUndefined();
        expect(mapper.match(DecoratorID.EXAMPLE, decorators)).toBeUndefined();
        expect(mapper.match(DecoratorID.EXAMPLE, decoratorsWithResponseExample)).toBeUndefined();
        expect(mapper.match(DecoratorID.TAGS, decorators)).toBeUndefined();
    });

    it('should work with preset swagger', async () => {
        await mapper.applyPreset('@trapi/decorators');

        expect(mapper.match(DecoratorID.TAGS, decorators)).toBeDefined();
        expect(mapper.match(DecoratorID.EXAMPLE, decorators)).toBeUndefined();
        expect(mapper.match(DecoratorID.EXAMPLE, decoratorsWithResponseExample)).toBeDefined();
    });

    it('should work with preset typescript-rest', async () => {
        const data = [...decorators, { text: 'Example', arguments: [], typeArguments: [] }];

        await mapper.applyPreset('@trapi/decorators');
        expect(mapper.match(DecoratorID.EXAMPLE, data)).toBeDefined();
    });

    it('should match', () => {
        mapper.apply([{
            id: DecoratorID.TAGS,
            name: 'Tags',
            properties: {
                value: {},
            },
        },
        ]);

        const match = mapper.match(DecoratorID.TAGS, decorators);

        expect(match).toBeDefined();
        expect(match).toBeInstanceOf(DecoratorPropertyManager);
    });
});
