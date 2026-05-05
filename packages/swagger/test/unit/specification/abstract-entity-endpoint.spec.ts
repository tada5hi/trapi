/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { 
    beforeAll, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { load } from 'locter';
import jsonata from 'jsonata';
import type { Metadata } from '@trapi/core';
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';

describe('AbstractEntityEndpoint', () => {
    let spec : SpecV2 | SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    it('should not duplicate inherited properties in the required list', async () => {
        const expression = jsonata('definitions.NamedEntity.required');
        expect(await expression.evaluate(spec)).toStrictEqual(['id', 'name']);
    });

    it('should use property description from base class if not defined in child', async () => {
        const expression = jsonata('definitions.NamedEntity.properties.id.description');
        expect(await expression.evaluate(spec)).toEqual('A numeric identifier');
    });
});
