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
    parseSecurityDefinitions,
    parseStrict,
    resolveOutput,
    splitCsv,
    splitOutputPath,
} from '../../../src/commands/utils.ts';
import { CLIUserError } from '../../../src/logger.ts';

describe('normalizeVersion', () => {
    it('accepts canonical values verbatim', () => {
        expect(normalizeVersion('v2')).toBe('v2');
        expect(normalizeVersion('v3')).toBe('v3');
        expect(normalizeVersion('v3.1')).toBe('v3.1');
        expect(normalizeVersion('v3.2')).toBe('v3.2');
    });

    it('prefixes a leading "v" when omitted', () => {
        expect(normalizeVersion('2')).toBe('v2');
        expect(normalizeVersion('3.1')).toBe('v3.1');
    });

    it('throws CLIUserError with the supported list when the value is unknown', () => {
        expect(() => normalizeVersion('bogus')).toThrowError(CLIUserError);
        expect(() => normalizeVersion('bogus')).toThrowError(/Unknown OpenAPI version "bogus"/);
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
    });

    it('returns undefined for unrecognised or missing extensions', () => {
        expect(detectFormatFromPath('spec')).toBeUndefined();
        expect(detectFormatFromPath('spec.txt')).toBeUndefined();
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
        expect(resolveOutput('spec.yaml', undefined)).toEqual({
            cwd: process.cwd(),
            name: 'spec',
            format: 'yaml',
        });
    });

    it('keeps an absolute path verbatim', () => {
        const abs = path.resolve('/tmp', 'cli-test', 'openapi.yaml');
        expect(resolveOutput(abs, undefined)).toEqual({
            cwd: path.dirname(abs),
            name: 'openapi',
            format: 'yaml',
        });
    });

    it('honours an explicit format over the file extension', () => {
        expect(resolveOutput('spec.json', 'yaml')).toEqual({
            cwd: process.cwd(),
            name: 'spec',
            format: 'yaml',
        });
    });

    it('throws CLIUserError on unknown format', () => {
        expect(() => resolveOutput('spec.json', 'xml')).toThrowError(CLIUserError);
    });
});

describe('splitOutputPath', () => {
    it('rejects relative paths', () => {
        expect(() => splitOutputPath('docs/openapi.json')).toThrowError(CLIUserError);
    });

    it('splits absolute path into cwd/name/format', () => {
        const abs = path.resolve('/tmp', 'docs', 'openapi.json');
        expect(splitOutputPath(abs)).toEqual({
            cwd: path.dirname(abs),
            name: 'openapi',
            format: 'json',
        });
    });

    it('honours format override', () => {
        const abs = path.resolve('/tmp', 'docs', 'openapi');
        expect(splitOutputPath(abs, 'yaml')).toEqual({
            cwd: path.dirname(abs),
            name: 'openapi',
            format: 'yaml',
        });
    });
});

describe('splitCsv', () => {
    it('returns undefined for undefined input', () => {
        expect(splitCsv(undefined)).toBeUndefined();
    });

    it('returns undefined for empty input', () => {
        expect(splitCsv('')).toBeUndefined();
        expect(splitCsv('  , , ')).toBeUndefined();
    });

    it('trims and filters empty pieces', () => {
        expect(splitCsv(' a, b ,, c ')).toEqual(['a', 'b', 'c']);
    });

    it('returns a single-element array for one value', () => {
        expect(splitCsv('only')).toEqual(['only']);
    });
});

describe('parseStrict', () => {
    it('returns undefined for undefined input', () => {
        expect(parseStrict(undefined)).toBeUndefined();
    });

    it('parses canonical string forms', () => {
        expect(parseStrict('true')).toBe(true);
        expect(parseStrict('')).toBe(true);
        expect(parseStrict('false')).toBe(false);
        expect(parseStrict('throw')).toBe('throw');
    });

    it('throws CLIUserError on unknown values', () => {
        expect(() => parseStrict('warn')).toThrowError(CLIUserError);
    });
});

describe('parseSecurityDefinitions', () => {
    it('returns undefined for undefined / empty input', () => {
        expect(parseSecurityDefinitions(undefined)).toBeUndefined();
        expect(parseSecurityDefinitions('')).toBeUndefined();
    });

    it('parses a JSON object', () => {
        const json = '{"bearer":{"type":"apiKey","name":"Authorization","in":"header"}}';
        expect(parseSecurityDefinitions(json)).toEqual({
            bearer: {
                type: 'apiKey', 
                name: 'Authorization', 
                in: 'header', 
            }, 
        });
    });

    it('throws CLIUserError on invalid JSON', () => {
        expect(() => parseSecurityDefinitions('not json')).toThrowError(CLIUserError);
    });

    it('throws CLIUserError when JSON is not an object', () => {
        expect(() => parseSecurityDefinitions('"a string"')).toThrowError(CLIUserError);
        expect(() => parseSecurityDefinitions('[1,2,3]')).toThrowError(CLIUserError);
    });
});
