/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ConfigError } from '../../../../src/core/error/config';
import {
    loadRegistryByName,
    resolvePresetByName,
} from '../../../../src/adapters/decorator/v2';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = (name: string) => path.resolve(here, './data', name);

describe('resolvePresetByName', () => {
    it('resolves a preset exported as named `preset`', async () => {
        const preset = await resolvePresetByName(fixturePath('preset-named.ts'));
        expect(preset.name).toEqual('fixture-named');
        expect(preset.methods).toHaveLength(1);
    });

    it('resolves a preset exported as default', async () => {
        const preset = await resolvePresetByName(fixturePath('preset-default.ts'));
        expect(preset.name).toEqual('fixture-default');
        expect(preset.methods?.[0].match.name).toEqual('Post');
    });

    it('throws ConfigError when the lookup path cannot be resolved', async () => {
        await expect(resolvePresetByName(fixturePath('does-not-exist.ts')))
            .rejects.toBeInstanceOf(ConfigError);
    });

    it('attaches the underlying error as `cause`', async () => {
        const promise = resolvePresetByName(fixturePath('does-not-exist.ts'));
        await promise.catch((err) => {
            expect(err).toBeInstanceOf(ConfigError);
            expect((err as Error & { cause?: unknown }).cause).toBeDefined();
        });
    });
});

describe('loadRegistryByName', () => {
    it('materializes a registry from a named preset', async () => {
        const registry = await loadRegistryByName(fixturePath('preset-named.ts'));
        expect(registry.methods).toHaveLength(1);
        expect(registry.methods[0].match.name).toEqual('Get');
    });

    it('resolves `extends` chains through the same loader', async () => {
        const registry = await loadRegistryByName(fixturePath('preset-extends.ts'));
        // parent contributes Get, child contributes Put — both should land in the registry.
        const names = registry.methods.map((h) => h.match.name).sort();
        expect(names).toEqual(['Get', 'Put']);
    });
});
