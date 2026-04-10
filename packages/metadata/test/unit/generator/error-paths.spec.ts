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
import { generateMetadata } from '../../../src';

describe('metadata generation error paths', () => {
    describe('invalid entry points', () => {
        it('should return empty metadata for non-existent path', async () => {
            const metadata = await generateMetadata({ entryPoint: './this/path/does/not/exist' });

            expect(metadata).toBeDefined();
            expect(metadata.controllers).toEqual([]);
            expect(metadata.referenceTypes).toEqual({});
        });

        it('should return empty metadata for glob matching no files', async () => {
            const metadata = await generateMetadata({ entryPoint: './test/data/**/*.nonexistent' });

            expect(metadata).toBeDefined();
            expect(metadata.controllers).toEqual([]);
        });
    });

    describe('empty entry points', () => {
        it('should throw for empty string entry point', async () => {
            // Empty string is not a valid glob pattern
            await expect(
                generateMetadata({ entryPoint: '' }),
            ).rejects.toThrow();
        });

        it('should handle empty array entry point', async () => {
            const metadata = await generateMetadata({ entryPoint: [] });

            expect(metadata).toBeDefined();
            expect(metadata.controllers).toEqual([]);
        });
    });

    describe('cache disabled', () => {
        it('should work with cache explicitly disabled', async () => {
            const metadata = await generateMetadata({
                entryPoint: './test/data/nonexistent',
                cache: false,
            });

            expect(metadata).toBeDefined();
            expect(metadata.controllers).toEqual([]);
        });
    });
});
