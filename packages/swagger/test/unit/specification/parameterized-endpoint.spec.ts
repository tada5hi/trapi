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
import type { Metadata } from '@trapi/metadata';
import type { SpecV2, SpecV3 } from '../../../src';
import { Version, generateSwagger } from '../../../src';

describe('ParameterizedEndpoint', () => {
    let spec : SpecV2 | SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        spec = await generateSwagger({
            version: Version.V2,
            metadata,
            data: { servers: 'http://localhost:3000/' },
        });
    });

    it('should generate path param for params declared on class', async () => {
        const expression = jsonata('paths."/parameterized/{objectId}/test".get.parameters[0].in');
        expect(await expression.evaluate(spec)).toEqual('path');
    });
});
