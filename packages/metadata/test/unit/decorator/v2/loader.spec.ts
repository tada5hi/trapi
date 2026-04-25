/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    type Preset,
    type PresetResolver,
    loadRegistry,
} from '../../../../src/adapters/decorator/v2';

const noopApply = () => {
    /* no-op */
};

function makeResolver(presets: Preset[]): PresetResolver {
    const map = new Map(presets.map((p) => [p.name, p]));
    return (name) => {
        const found = map.get(name);
        if (!found) {
            throw new Error(`unknown preset: ${name}`);
        }
        return found;
    };
}

describe('loadRegistry', () => {
    it('returns empty registry for a preset with no handlers', async () => {
        const preset: Preset = { name: 'empty' };
        const registry = await loadRegistry(preset, { resolver: makeResolver([]) });
        expect(registry.controllers).toEqual([]);
        expect(registry.methods).toEqual([]);
        expect(registry.parameters).toEqual([]);
    });

    it('preserves own handler order', async () => {
        const preset: Preset = {
            name: 'p',
            methods: [
                { match: { name: 'Get' }, apply: noopApply },
                { match: { name: 'Post' }, apply: noopApply },
            ],
        };
        const registry = await loadRegistry(preset, { resolver: makeResolver([]) });
        expect(registry.methods.map((h) => h.match.name)).toEqual(['Get', 'Post']);
    });

    it('appends own handlers after parent handlers (additive)', async () => {
        const parent: Preset = {
            name: 'parent',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const child: Preset = {
            name: 'child',
            extends: ['parent'],
            methods: [{ match: { name: 'Post' }, apply: noopApply }],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([parent]) });
        expect(registry.methods.map((h) => h.match.name)).toEqual(['Get', 'Post']);
    });

    it('keeps multiple matching handlers when child does not declare replaces (additive)', async () => {
        const parent: Preset = {
            name: 'parent',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const child: Preset = {
            name: 'child',
            extends: ['parent'],
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([parent]) });
        expect(registry.methods).toHaveLength(2);
    });

    it('replaces:true shadows all parent handlers matching by name', async () => {
        const parentA: Preset = {
            name: 'parentA',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const parentB: Preset = {
            name: 'parentB',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const child: Preset = {
            name: 'child',
            extends: ['parentA', 'parentB'],
            methods: [{
                match: { name: 'Get' }, 
                replaces: true, 
                apply: noopApply, 
            }],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([parentA, parentB]) });
        expect(registry.methods).toHaveLength(1);
        expect(registry.methods[0].replaces).toBe(true);
    });

    it("replaces:'<name>' shadows only that preset's handler", async () => {
        const parentA: Preset = {
            name: 'parentA',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const parentB: Preset = {
            name: 'parentB',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const child: Preset = {
            name: 'child',
            extends: ['parentA', 'parentB'],
            methods: [{
                match: { name: 'Get' }, 
                replaces: 'parentA', 
                apply: noopApply, 
            }],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([parentA, parentB]) });
        expect(registry.methods).toHaveLength(2);
        expect(registry.methods.map((h) => h.replaces)).toEqual([undefined, 'parentA']);
    });

    it('replaces respects match.on filter', async () => {
        const parent: Preset = {
            name: 'parent',
            methods: [
                { match: { name: 'Body', on: 'method' }, apply: noopApply },
                { match: { name: 'Body', on: 'parameter' }, apply: noopApply },
            ],
        };
        const child: Preset = {
            name: 'child',
            extends: ['parent'],
            methods: [{
                match: { name: 'Body', on: 'method' }, 
                replaces: true, 
                apply: noopApply, 
            }],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([parent]) });
        expect(registry.methods).toHaveLength(2);
        const survivors = registry.methods.map((h) => `${h.match.name}:${h.match.on ?? ''}`);
        expect(survivors).toContain('Body:parameter');
    });

    it('strict mode throws when replaces does not match any parent', async () => {
        const child: Preset = {
            name: 'child',
            methods: [{
                match: { name: 'Get' }, 
                replaces: true, 
                apply: noopApply, 
            }],
        };
        await expect(
            loadRegistry(child, { resolver: makeResolver([]), strict: true }),
        ).rejects.toThrow(/did not match any parent/);
    });

    it('non-strict mode allows replaces with no parent (silent)', async () => {
        const child: Preset = {
            name: 'child',
            methods: [{
                match: { name: 'Get' }, 
                replaces: true, 
                apply: noopApply, 
            }],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([]) });
        expect(registry.methods).toHaveLength(1);
    });

    it('detects extends cycles', async () => {
        const a: Preset = { name: 'a', extends: ['b'] };
        const b: Preset = { name: 'b', extends: ['a'] };
        await expect(
            loadRegistry(a, { resolver: makeResolver([a, b]) }),
        ).rejects.toThrow(/cycle/i);
    });

    it('handles diamond inheritance (preset loaded twice via different parents)', async () => {
        const base: Preset = {
            name: 'base',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const left: Preset = { name: 'left', extends: ['base'] };
        const right: Preset = { name: 'right', extends: ['base'] };
        const child: Preset = { name: 'child', extends: ['left', 'right'] };
        const registry = await loadRegistry(child, { resolver: makeResolver([base, left, right]) });
        expect(registry.methods).toHaveLength(2);
    });

    it('applies replaces in the order parents are declared', async () => {
        const parent: Preset = {
            name: 'parent',
            controllers: [{ match: { name: 'Controller' }, apply: noopApply }],
        };
        const child: Preset = {
            name: 'child',
            extends: ['parent'],
            controllers: [
                {
                    match: { name: 'Controller' }, 
                    replaces: true, 
                    apply: noopApply, 
                },
            ],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([parent]) });
        expect(registry.controllers).toHaveLength(1);
        expect(registry.controllers[0].replaces).toBe(true);
    });

    it('supports JSDoc handlers in extends/replaces flow', async () => {
        const parent: Preset = {
            name: 'parent',
            methodJsDoc: [{ match: { tag: 'hidden' }, apply: noopApply }],
        };
        const child: Preset = {
            name: 'child',
            extends: ['parent'],
            methodJsDoc: [
                {
                    match: { tag: 'hidden' }, 
                    replaces: 'parent', 
                    apply: noopApply, 
                },
                { match: { tag: 'deprecated' }, apply: noopApply },
            ],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([parent]) });
        expect(registry.methodJsDoc.map((h) => h.match.tag)).toEqual(['hidden', 'deprecated']);
    });
});
