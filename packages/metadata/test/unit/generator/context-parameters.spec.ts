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
import type { Metadata } from '@trapi/core';
import { generateMetadata } from '../../../src';

describe('context parameters', () => {
    let metadata: Metadata;

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/context-parameters'),
                pattern: '**/*.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });
    });

    it('should drop context parameters from the method', () => {
        const [method] = metadata.controllers[0]!.methods;

        expect(method!.parameters.map((p) => [p.name, p.in])).toEqual([['filter', 'queryProp']]);
    });

    it('should not register types reachable only through context parameters', () => {
        expect(Object.keys(metadata.referenceTypes).sort()).toEqual(['IContextUser']);
    });
});
