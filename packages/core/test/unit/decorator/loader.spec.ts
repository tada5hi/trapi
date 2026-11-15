/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    type ControllerFinalizer,
    type MethodFinalizer,
    type Preset,
    type PresetResolver,
    type Registry,
    createRegistry,
    loadRegistry,
    mergeRegistries,
} from '../../../src/decorator';

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

    it('replaces only shadows parent handlers with the same name', async () => {
        const parent: Preset = {
            name: 'parent',
            methods: [
                { match: { name: 'Body', on: 'method' }, apply: noopApply },
                { match: { name: 'Form', on: 'method' }, apply: noopApply },
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

        // Body handler from parent is shadowed; child's Body and parent's Form survive.
        expect(registry.methods).toHaveLength(2);

        const survivors = registry.methods.map((h) => h.match.name).sort();

        expect(survivors).toEqual(['Body', 'Form']);
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

    it('replaces:true does not shadow own-preset siblings (additive within preset)', async () => {
        const child: Preset = {
            name: 'child',
            methods: [
                { match: { name: 'Get' }, apply: noopApply },
                {
                    match: { name: 'Get' },
                    replaces: true,
                    apply: noopApply,
                },
            ],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([]) });

        expect(registry.methods).toHaveLength(2);
        expect(registry.methods.map((h) => h.replaces)).toEqual([undefined, true]);
    });

    it('strict mode counts only parent removals, not own-preset siblings', async () => {
        const child: Preset = {
            name: 'child',
            methods: [
                { match: { name: 'Get' }, apply: noopApply },
                {
                    match: { name: 'Get' },
                    replaces: true,
                    apply: noopApply,
                },
            ],
        };

        await expect(
            loadRegistry(child, { resolver: makeResolver([]), strict: true }),
        ).rejects.toThrow(/did not match any parent/);
    });

    it('detects extends cycles', async () => {
        const a: Preset = { name: 'a', extends: ['b'] };
        const b: Preset = { name: 'b', extends: ['a'] };

        await expect(
            loadRegistry(a, { resolver: makeResolver([a, b]) }),
        ).rejects.toThrow(/cycle/i);
    });

    it('handles diamond inheritance (preset reached via different parents is no cycle)', async () => {
        const base: Preset = {
            name: 'base',
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
        };
        const left: Preset = { name: 'left', extends: ['base'] };
        const right: Preset = { name: 'right', extends: ['base'] };
        const child: Preset = { name: 'child', extends: ['left', 'right'] };
        const registry = await loadRegistry(child, { resolver: makeResolver([base, left, right]) });

        expect(registry.methods).toHaveLength(1);
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

    it('wraps preset-validation failures as CoreError(PRESET_INVALID)', async () => {
        // Missing `name` is a zod schema violation that surfaces from validup.
        const invalid = { methods: [] } as unknown as Preset;

        await expect(
            loadRegistry(invalid, { resolver: makeResolver([]) }),
        ).rejects.toMatchObject({ code: 'CORE_PRESET_INVALID' });
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

    it('collects finalizers parents-first', async () => {
        const grandMethod: MethodFinalizer = () => { /* grandparent */ };
        const parentMethod: MethodFinalizer = () => { /* parent */ };
        const ownMethod: MethodFinalizer = () => { /* own */ };
        const grandController: ControllerFinalizer = () => { /* grandparent */ };
        const ownController: ControllerFinalizer = () => { /* own */ };

        const grandparent: Preset = {
            name: 'grandparent',
            finalizeMethod: grandMethod,
            finalizeController: grandController,
        };
        const parent: Preset = {
            name: 'parent',
            extends: ['grandparent'],
            finalizeMethod: parentMethod,
        };
        const child: Preset = {
            name: 'child',
            extends: ['parent'],
            finalizeMethod: ownMethod,
            finalizeController: ownController,
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([grandparent, parent]) });

        expect(registry.methodFinalizers).toHaveLength(3);
        expect(registry.methodFinalizers![0]).toBe(grandMethod);
        expect(registry.methodFinalizers![1]).toBe(parentMethod);
        expect(registry.methodFinalizers![2]).toBe(ownMethod);
        expect(registry.controllerFinalizers).toHaveLength(2);
        expect(registry.controllerFinalizers![0]).toBe(grandController);
        expect(registry.controllerFinalizers![1]).toBe(ownController);
    });

    it('collects a shared ancestor handler once', async () => {
        const base: Preset = {
            name: 'base',
            controllers: [{ match: { name: 'Controller' }, apply: noopApply }],
            methods: [
                { match: { name: 'Get' }, apply: noopApply },
                // Same-preset siblings stay additive, shared ancestor or not.
                { match: { name: 'Get' }, apply: noopApply },
            ],
            methodJsDoc: [{ match: { tag: 'hidden' }, apply: noopApply }],
        };
        const left: Preset = {
            name: 'left',
            extends: ['base'],
            methods: [{ match: { name: 'Post' }, apply: noopApply }],
        };
        const right: Preset = {
            name: 'right',
            extends: ['base'],
            methods: [{ match: { name: 'Put' }, apply: noopApply }],
        };
        const child: Preset = {
            name: 'child',
            extends: ['left', 'right'],
            methods: [{ match: { name: 'Delete' }, apply: noopApply }],
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([base, left, right]) });

        expect(registry.controllers.map((h) => h.match.name)).toEqual(['Controller']);
        expect(registry.methods.map((h) => h.match.name)).toEqual(['Get', 'Get', 'Post', 'Put', 'Delete']);
        expect(registry.methodJsDoc.map((h) => h.match.tag)).toEqual(['hidden']);
    });

    it('keeps a shared ancestor handler that only one path replaces', async () => {
        const baseApply = () => { /* base */ };
        const leftApply = () => { /* left */ };

        const base: Preset = {
            name: 'base',
            methods: [
                { match: { name: 'Get' }, apply: baseApply },
                { match: { name: 'Post' }, apply: baseApply },
            ],
        };
        const left: Preset = {
            name: 'left',
            extends: ['base'],
            methods: [{
                match: { name: 'Get' },
                replaces: true,
                apply: leftApply,
            }],
        };
        const right: Preset = { name: 'right', extends: ['base'] };
        const child: Preset = { name: 'child', extends: ['left', 'right'] };
        const registry = await loadRegistry(child, { resolver: makeResolver([base, left, right]) });

        // `right` still inherits base's `Get`, so it survives once, after the
        // handlers of the path that replaced it; `Post` is not repeated.
        expect(registry.methods.map((h) => [h.match.name, h.apply])).toEqual([
            ['Post', baseApply],
            ['Get', leftApply],
            ['Get', baseApply],
        ]);
    });

    it('collects a shared ancestor finalizer once', async () => {
        const baseMethod: MethodFinalizer = () => { /* base */ };
        const baseController: ControllerFinalizer = () => { /* base */ };
        const leftMethod: MethodFinalizer = () => { /* left */ };
        const rightMethod: MethodFinalizer = () => { /* right */ };
        const ownMethod: MethodFinalizer = () => { /* own */ };

        const base: Preset = {
            name: 'base',
            finalizeMethod: baseMethod,
            finalizeController: baseController,
        };
        const left: Preset = {
            name: 'left',
            extends: ['base'],
            finalizeMethod: leftMethod,
        };
        const right: Preset = {
            name: 'right',
            extends: ['base'],
            finalizeMethod: rightMethod,
        };
        const child: Preset = {
            name: 'child',
            extends: ['left', 'right'],
            finalizeMethod: ownMethod,
        };
        const registry = await loadRegistry(child, { resolver: makeResolver([base, left, right]) });

        expect(registry.methodFinalizers).toHaveLength(4);
        expect(registry.methodFinalizers![0]).toBe(baseMethod);
        expect(registry.methodFinalizers![1]).toBe(leftMethod);
        expect(registry.methodFinalizers![2]).toBe(rightMethod);
        expect(registry.methodFinalizers![3]).toBe(ownMethod);
        expect(registry.controllerFinalizers).toHaveLength(1);
        expect(registry.controllerFinalizers![0]).toBe(baseController);
    });

    it('wraps a non-function finalizeMethod as CoreError(PRESET_INVALID)', async () => {
        const invalid = { name: 'bad', finalizeMethod: 'not-a-fn' } as unknown as Preset;

        await expect(
            loadRegistry(invalid, { resolver: makeResolver([]) }),
        ).rejects.toMatchObject({ code: 'CORE_PRESET_INVALID' });
    });

    it('registry has empty finalizer arrays when no preset declares one', async () => {
        const parent: Preset = { name: 'parent' };
        const child: Preset = { name: 'child', extends: ['parent'] };
        const registry = await loadRegistry(child, { resolver: makeResolver([parent]) });

        expect(registry.methodFinalizers).toEqual([]);
        expect(registry.controllerFinalizers).toEqual([]);
    });
});

describe('createRegistry', () => {
    it('defaults finalizer arrays to []', () => {
        const registry = createRegistry();

        expect(registry.methodFinalizers).toEqual([]);
        expect(registry.controllerFinalizers).toEqual([]);
    });
});

describe('mergeRegistries', () => {
    it('appends finalizers', () => {
        const a1: MethodFinalizer = () => { /* a */ };
        const b1: MethodFinalizer = () => { /* b */ };
        const ac: ControllerFinalizer = () => { /* a */ };
        const bc: ControllerFinalizer = () => { /* b */ };

        const merged = mergeRegistries(
            createRegistry({ methodFinalizers: [a1], controllerFinalizers: [ac] }),
            createRegistry({ methodFinalizers: [b1], controllerFinalizers: [bc] }),
        );

        expect(merged.methodFinalizers).toHaveLength(2);
        expect(merged.methodFinalizers![0]).toBe(a1);
        expect(merged.methodFinalizers![1]).toBe(b1);
        expect(merged.controllerFinalizers).toHaveLength(2);
        expect(merged.controllerFinalizers![0]).toBe(ac);
        expect(merged.controllerFinalizers![1]).toBe(bc);
    });

    it('tolerates registries without finalizer arrays', () => {
        const fin: MethodFinalizer = () => { /* b */ };
        // A hand-built literal (pre-finalizer shape) carries no finalizer arrays.
        const bare: Registry = {
            controllers: [],
            methods: [],
            parameters: [],
            controllerJsDoc: [],
            methodJsDoc: [],
            parameterJsDoc: [],
        };

        const merged = mergeRegistries(bare, createRegistry({ methodFinalizers: [fin] }));

        expect(merged.methodFinalizers).toHaveLength(1);
        expect(merged.methodFinalizers![0]).toBe(fin);
        expect(merged.controllerFinalizers).toEqual([]);
        expect(mergeRegistries(bare, bare).methodFinalizers).toEqual([]);
    });
});
