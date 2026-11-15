import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CoreErrorCode } from '@trapi/core';
import { generateMetadata } from '@trapi/metadata';

const here = path.dirname(fileURLToPath(import.meta.url));
const presetPath = path.resolve(here, '../src/preset.ts');

describe('@trapi/example-decorators', () => {
    it('discovers controllers and methods via the bundled preset', async () => {
        const metadata = await generateMetadata({
            entryPoint: [{ cwd: path.resolve(here, '..'), pattern: 'fixtures/**/*.ts' }],
            preset: presetPath,
            cache: false,
        });

        expect(metadata.controllers).toHaveLength(1);

        const [controller] = metadata.controllers;

        expect(controller.name).toBe('UsersController');
        // normalizePath strips the leading slash
        expect(controller.paths).toEqual(['users']);

        const verbs = controller.methods.map((m) => m.method).sort();

        expect(verbs).toEqual(['get', 'get', 'post']);

        const create = controller.methods.find((m) => m.method === 'post');

        expect(create?.parameters).toHaveLength(1);
        expect(create?.parameters[0].in).toBe('body');

        const getById = controller.methods.find((m) => m.path === ':id');

        expect(getById?.parameters[0].in).toBe('path');
        expect(getById?.parameters[0].name).toBe('id');
    });

    it('documents a @Description status given as a resolved constant', async () => {
        const metadata = await generateMetadata({
            entryPoint: [{ cwd: path.resolve(here, 'data/status/resolved'), pattern: '**/*.ts' }],
            preset: presetPath,
            cache: false,
        });

        const [controller] = metadata.controllers;
        const created = controller.methods.find((m) => m.name === 'created');
        const missing = controller.methods.find((m) => m.name === 'missing');

        expect(created?.responses.map((r) => [r.status, r.description])).toEqual([
            ['201', 'Created'],
            ['200', 'Ok'],
        ]);
        expect(missing?.responses.map((r) => [r.status, r.description])).toEqual([
            ['404', 'Not found'],
            ['200', 'Ok'],
        ]);
    });

    it('rejects a @Description status that cannot be resolved', async () => {
        await expect(generateMetadata({
            entryPoint: [{ cwd: path.resolve(here, 'data/status/unresolvable'), pattern: '**/*.ts' }],
            preset: presetPath,
            cache: false,
        })).rejects.toMatchObject({ code: CoreErrorCode.DECORATOR_ARGUMENT_INVALID });
    });
});
