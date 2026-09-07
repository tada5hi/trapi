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
import type { Controller, Metadata } from '@trapi/core';
import { generateMetadata } from '../../../src';

describe('constant decorator paths', () => {
    let metadata: Metadata;

    const controllerNamed = (name: string): Controller => {
        const controller = metadata.controllers.find((c) => c.name === name);
        expect(controller).toBeDefined();
        return controller!;
    };

    beforeAll(async () => {
        metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
                pattern: './test/data/controllers/const-paths.ts',
            }],
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });
    });

    // Paths arrive normalised: the metadata layer strips the leading slash and
    // the swagger emitter puts it back.
    it('should resolve a mount declared by an imported constant', () => {
        const controller = controllerNamed('ImportedConstController');
        expect(controller.paths).toEqual(['const-mount']);
    });

    it('should resolve a method path declared by an imported constant', () => {
        const controller = controllerNamed('ImportedConstController');
        expect(controller.methods[0]!.path).toEqual('const-sub');
    });

    it('should resolve every element of an array of imported constants', () => {
        const controller = controllerNamed('ImportedConstArrayController');
        expect(controller.paths).toEqual(['mount-a', 'mount-b']);
    });

    it('should resolve a mount declared by a template expression', () => {
        const controller = controllerNamed('TemplateExpressionController');
        expect(controller.paths).toEqual(['segment']);
    });

    it('should resolve a method path declared by a template expression', () => {
        const controller = controllerNamed('TemplateExpressionController');
        expect(controller.methods[0]!.path).toEqual('segment-sub');
    });

    it('should resolve a mount declared by a constant re-exported through a barrel', () => {
        const controller = controllerNamed('BarrelConstController');
        expect(controller.paths).toEqual(['const-mount']);
    });

    it('should keep resolving a mount declared by a local constant', () => {
        const controller = controllerNamed('LocalConstController');
        expect(controller.paths).toEqual(['local-mount']);
    });
});
