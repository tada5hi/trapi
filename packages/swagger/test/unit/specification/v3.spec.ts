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
import type { Metadata } from '@trapi/metadata';
import type { SpecV3 } from '../../../src';
import {
    Version,
    generate,
} from '../../../src';

describe('SpecGenerator', () => {
    let spec : SpecV3;

    beforeAll(async () => {
        const metadata : Metadata = await load('./test/data/metadata.json');

        spec = await generate({
            version: Version.V3,
            options: {
                output: false,
                servers: 'http://localhost:3000/api/',
                metadata,
            },
        });
    });

    it('should be able to generate open api 3.0 outputs', async () => {
        expect(spec.openapi).toEqual('3.0.0');
        expect(spec.servers).toBeDefined();
        expect(spec.servers[0].url).toEqual('http://localhost:3000/api/');
    });
});
