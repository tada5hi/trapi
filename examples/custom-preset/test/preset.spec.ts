import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMetadata } from '@trapi/metadata';

const here = path.dirname(fileURLToPath(import.meta.url));
const presetPath = path.resolve(here, '../src/preset.ts');

describe('@trapi/example-custom-preset', () => {
    it('discovers controllers and methods via the custom preset', async () => {
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
        expect(controller.tags).toEqual(['users']);

        const verbs = controller.methods.map((m) => m.method).sort();
        expect(verbs).toEqual(['get', 'get', 'post']);

        const create = controller.methods.find((m) => m.method === 'post');
        expect(create?.parameters).toHaveLength(1);
        expect(create?.parameters[0].in).toBe('body');

        const getById = controller.methods.find((m) => m.path === ':id');
        expect(getById?.parameters[0].in).toBe('path');
        expect(getById?.parameters[0].name).toBe('id');
    });
});
