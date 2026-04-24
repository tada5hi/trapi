/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    describe,
    expect,
    it,
} from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMetadata } from '../../../src';

const entryPoint = [{
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../decorators'),
    pattern: './test/data/controllers/**/*.ts',
}];

describe('generateMetadata', () => {
    it('should accept options with tsconfig', async () => {
        const metadata = await generateMetadata({
            entryPoint,
            cache: false,
            preset: '@trapi/decorators',
            tsconfig: undefined,
        });

        expect(metadata).toHaveProperty('controllers');
        expect(metadata).toHaveProperty('referenceTypes');
        expect(metadata.controllers.length).toBeGreaterThan(0);
    });

    it('should accept options without tsconfig', async () => {
        const metadata = await generateMetadata({
            entryPoint,
            cache: false,
            preset: '@trapi/decorators',
        });

        expect(metadata).toHaveProperty('controllers');
        expect(metadata.controllers.length).toBeGreaterThan(0);
    });
});
