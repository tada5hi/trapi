/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { generateMetadata } from '../../../src';

describe('src/generator/metadata', () => {
    it('should generate metadata', async () => {
        const data = await generateMetadata({
            entryPoint: './test/fake-path',
        });

        expect(data).toBeDefined();
        expect(data).toEqual({ controllers: [], referenceTypes: {} });
    });
});
