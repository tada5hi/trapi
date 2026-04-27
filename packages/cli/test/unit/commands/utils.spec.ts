/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import process from 'node:process';
import { describe, expect, it } from 'vitest';
import {
    detectFormatFromPath,
    normalizeVersion,
    resolveOutput,
} from '../../../src/commands/utils.ts';

describe('normalizeVersion', () => {
    it('accepts canonical values verbatim', () => {
        expect(normalizeVersion('v2')).toBe('v2');
        expect(normalizeVersion('v3')).toBe('v3');
        expect(normalizeVersion('v3.1')).toBe('v3.1');
        expect(normalizeVersion('v3.2')).toBe('v3.2');
    });

    it('prefixes a leading "v" when omitted', () => {
        expect(normalizeVersion('2')).toBe('v2');
        expect(normalizeVersion('3')).toBe('v3');
        expect(normalizeVersion('3.1')).toBe('v3.1');
        expect(normalizeVersion('3.2')).toBe('v3.2');
    });

    it('throws with the supported list when the value is unknown', () => {
        expect(() => normalizeVersion('bogus')).toThrowError(
            /Unknown OpenAPI version "bogus"\. Supported: v2, v3, v3\.1, v3\.2\./,
        );
    });

    it('throws for almost-valid values that miss the supported set', () => {
        expect(() => normalizeVersion('v3.0')).toThrowError(/Unknown OpenAPI version/);
        expect(() => normalizeVersion('4')).toThrowError(/Unknown OpenAPI version/);
    });
});

describe('detectFormatFromPath', () => {
    it('returns yaml for .yaml and .yml extensions', () => {
        expect(detectFormatFromPath('spec.yaml')).toBe('yaml');
        expect(detectFormatFromPath('spec.yml')).toBe('yaml');
        expect(detectFormatFromPath('/abs/path/openapi.YAML')).toBe('yaml');
    });

    it('returns json for .json extension', () => {
        expect(detectFormatFromPath('spec.json')).toBe('json');
        expect(detectFormatFromPath('docs/api.JSON')).toBe('json');
    });

    it('returns undefined for unrecognised or missing extensions', () => {
        expect(detectFormatFromPath('spec')).toBeUndefined();
        expect(detectFormatFromPath('spec.txt')).toBeUndefined();
        expect(detectFormatFromPath('spec.toml')).toBeUndefined();
    });
});

describe('resolveOutput', () => {
    it('falls back to swagger.json under cwd when output is undefined', () => {
        const result = resolveOutput(undefined, undefined);
        expect(result).toEqual({
            cwd: process.cwd(),
            name: 'swagger',
            format: 'json',
        });
    });

    it('infers json from a relative .json output and resolves cwd against process.cwd()', () => {
        const result = resolveOutput('docs/openapi.json', undefined);
        expect(result).toEqual({
            cwd: path.join(process.cwd(), 'docs'),
            name: 'openapi',
            format: 'json',
        });
    });

    it('infers yaml from a .yaml extension', () => {
        const result = resolveOutput('spec.yaml', undefined);
        expect(result).toEqual({
            cwd: process.cwd(),
            name: 'spec',
            format: 'yaml',
        });
    });

    it('keeps an absolute path verbatim', () => {
        const abs = path.resolve('/tmp', 'cli-test', 'openapi.yaml');
        const result = resolveOutput(abs, undefined);
        expect(result).toEqual({
            cwd: path.dirname(abs),
            name: 'openapi',
            format: 'yaml',
        });
    });

    it('lets --format override the extension-derived format', () => {
        const result = resolveOutput('spec.json', 'yaml');
        expect(result.format).toBe('yaml');
        expect(result.name).toBe('spec');
    });

    it('defaults to json when the extension is unrecognised and --format is unset', () => {
        const result = resolveOutput('spec.txt', undefined);
        expect(result).toEqual({
            cwd: process.cwd(),
            name: 'spec',
            format: 'json',
        });
    });

    it('throws on an unsupported --format value', () => {
        expect(() => resolveOutput('spec.json', 'bogus')).toThrowError(
            /Unknown output format "bogus"\. Supported: yaml, json\./,
        );
    });
});
