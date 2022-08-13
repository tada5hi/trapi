/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createMetadataGenerator, generateMetadata } from '../../../src';

describe('src/utils/factory.ts', () => {
    it('should create metadata generator', () => {
        const generator = createMetadataGenerator({
            entryFile: './test/fake-path',
        });

        expect(generator).toBeDefined();
    });

    it('should skip loading compiler Options', () => {
        let generator = createMetadataGenerator({
            entryFile: './test/fake-path',
        }, {});

        expect(generator).toBeDefined();

        generator = createMetadataGenerator({
            entryFile: './test/fake-path',
        }, false);

        expect(generator).toBeDefined();
    });

    it('should generate metadata', () => {
        const data = generateMetadata({
            entryFile: './test/fake-path',
        });

        expect(data).toBeDefined();
        expect(data).toEqual({ controllers: [], referenceTypes: {} });
    });
});
