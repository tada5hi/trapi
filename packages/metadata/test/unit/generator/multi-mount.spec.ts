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

describe('multi-mount controller paths', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../decorators'),
                pattern: './test/data/controllers/multi-mount.ts',
            }],
            cache: false,
            preset: '@trapi/decorators',
        });
    });

    it('should expose every mount path in controller.paths', () => {
        const controller = metadata.controllers.find((c) => c.name === 'RolesController');
        expect(controller).toBeDefined();
        expect(controller!.paths).toEqual(['roles', 'realms/:realmId/roles']);
    });

    it('should treat path parameters from any mount as valid', () => {
        // The `detail` method declares @Path('id'), which only appears in the
        // method-level path '/:id'. Validation should pass against the union
        // of all controller mounts × method.path.
        const controller = metadata.controllers.find((c) => c.name === 'RolesController');
        const detail = controller!.methods.find((m) => m.name === 'detail');
        expect(detail).toBeDefined();
        const idParam = detail!.parameters.find((p) => p.name === 'id');
        expect(idParam).toBeDefined();
        expect(idParam!.in).toEqual('path');
    });
});
