/*
 * Copyright (c) 2026.
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
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Metadata } from '../../../src';
import { generateMetadata } from '../../../src';

describe('extensions on Controller and Parameter', () => {
    let metadata : Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../decorators'),
                pattern: './test/data/controllers/extensions.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });
    });

    it('should populate extensions on the controller', () => {
        const controller = metadata.controllers.find((c) => c.name === 'ExtensionsController');
        expect(controller).toBeDefined();
        expect(controller!.extensions).toHaveLength(2);
        expect(controller!.extensions).toContainEqual({ key: 'x-controller', value: 'controller-value' });
        expect(controller!.extensions).toContainEqual({ key: 'x-controller-meta', value: { team: 'platform' } });
    });

    it('should populate extensions on a parameter', () => {
        const controller = metadata.controllers.find((c) => c.name === 'ExtensionsController');
        const method = controller!.methods.find((m) => m.name === 'list');
        expect(method).toBeDefined();
        const limitParameter = method!.parameters.find((p) => p.name === 'limit');
        expect(limitParameter).toBeDefined();
        expect(limitParameter!.extensions).toHaveLength(1);
        expect(limitParameter!.extensions).toContainEqual({ key: 'x-param', value: 'param-value' });
    });

    it('should default extensions to an empty array when none are declared', () => {
        const controller = metadata.controllers.find((c) => c.name === 'ExtensionsController');
        const method = controller!.methods.find((m) => m.name === 'list');
        expect(method!.extensions).toEqual([]);
    });
});
