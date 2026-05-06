/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { isValidupError } from 'validup';
import {
    validatePreset,
} from '../../../src/decorator/validation';

const noopApply = () => {
    /* no-op */
};

describe('validatePreset', () => {
    it('accepts a minimal valid preset', async () => {
        const preset = { name: 'my-preset' };
        await expect(validatePreset(preset)).resolves.toMatchObject({ name: 'my-preset' });
    });

    it('accepts a preset with all handler kinds', async () => {
        const preset = {
            name: 'full-preset',
            extends: ['parent-preset'],
            controllers: [{ match: { name: 'Controller' }, apply: noopApply }],
            methods: [{ match: { name: 'Get', on: 'method' as const }, apply: noopApply }],
            parameters: [{
                match: { name: 'Body' }, 
                replaces: true as const, 
                apply: noopApply, 
            }],
            controllerJsDoc: [{ match: { tag: 'hidden' }, apply: noopApply }],
            methodJsDoc: [{ match: { tag: 'deprecated' }, apply: noopApply }],
            parameterJsDoc: [{ match: { tag: 'param' }, apply: noopApply }],
        };
        const result = await validatePreset(preset);
        expect(result.name).toEqual('full-preset');
        expect(result.controllers).toHaveLength(1);
        expect(result.methodJsDoc).toHaveLength(1);
    });

    it('rejects when name is missing', async () => {
        await expect(validatePreset({ controllers: [] })).rejects.toSatisfy((err) => isValidupError(err));
    });

    it('rejects when name is empty string', async () => {
        const preset = { name: '' };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it('rejects when handler apply is not a function', async () => {
        const preset = {
            name: 'bad-preset',
            controllers: [{ match: { name: 'Controller' }, apply: 'not-a-fn' }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it('rejects when handler match.name is missing', async () => {
        const preset = {
            name: 'bad-preset',
            methods: [{ match: {}, apply: noopApply }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it('rejects when match.on is not a known target', async () => {
        const preset = {
            name: 'bad-preset',
            methods: [{ match: { name: 'Get', on: 'middleware' }, apply: noopApply }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it('rejects when replaces is neither true nor a string', async () => {
        const preset = {
            name: 'bad-preset',
            methods: [{
                match: { name: 'Get' }, 
                replaces: 123, 
                apply: noopApply, 
            }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it('rejects when input is not an object', async () => {
        await expect(validatePreset(null)).rejects.toBeInstanceOf(TypeError);
        await expect(validatePreset('preset')).rejects.toBeInstanceOf(TypeError);
        await expect(validatePreset(42)).rejects.toBeInstanceOf(TypeError);
    });

    it('rejects array input', async () => {
        await expect(validatePreset([])).rejects.toBeInstanceOf(TypeError);
        await expect(validatePreset([{ name: 'p' }])).rejects.toBeInstanceOf(TypeError);
    });

    it('rejects JSDoc handler when match.tag is missing', async () => {
        const preset = {
            name: 'bad-preset',
            methodJsDoc: [{ match: {}, apply: noopApply }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it("rejects controllers[] entry whose match.on is 'method'", async () => {
        const preset = {
            name: 'bad-preset',
            controllers: [{ match: { name: 'Controller', on: 'method' }, apply: noopApply }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it("rejects methods[] entry whose match.on is 'class'", async () => {
        const preset = {
            name: 'bad-preset',
            methods: [{ match: { name: 'Get', on: 'class' }, apply: noopApply }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it("rejects parameters[] entry whose match.on is 'method'", async () => {
        const preset = {
            name: 'bad-preset',
            parameters: [{ match: { name: 'Body', on: 'method' }, apply: noopApply }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it("rejects controllerJsDoc[] entry whose match.on is 'parameter'", async () => {
        const preset = {
            name: 'bad-preset',
            controllerJsDoc: [{ match: { tag: 'note', on: 'parameter' }, apply: noopApply }],
        };
        await expect(validatePreset(preset)).rejects.toSatisfy((err) => isValidupError(err));
    });

    it('accepts handlers that omit match.on entirely', async () => {
        const preset = {
            name: 'good-preset',
            controllers: [{ match: { name: 'Controller' }, apply: noopApply }],
            methods: [{ match: { name: 'Get' }, apply: noopApply }],
            parameters: [{ match: { name: 'Body' }, apply: noopApply }],
        };
        await expect(validatePreset(preset)).resolves.toMatchObject({ name: 'good-preset' });
    });
});
