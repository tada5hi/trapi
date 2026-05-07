/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveEntry } from '../../../src/config/merge.ts';
import { CLIUserError } from '../../../src/logger.ts';

const cwd = path.resolve('/tmp', 'trapi-merge-test');

describe('resolveEntry', () => {
    it('throws when entryPoint is missing in both config and flags', () => {
        expect(() => resolveEntry({}, {}, cwd)).toThrowError(CLIUserError);
    });

    it('takes entryPoint from config when no flag override', () => {
        const t = resolveEntry(
            { metadata: { entryPoint: 'src/cfg.ts' } },
            {},
            cwd,
        );
        expect(t.metadata.entryPoint).toBe('src/cfg.ts');
    });

    it('CLI flag overrides config entryPoint', () => {
        const t = resolveEntry(
            { metadata: { entryPoint: 'src/cfg.ts' } },
            { entryPoint: 'src/flag.ts' },
            cwd,
        );
        expect(t.metadata.entryPoint).toBe('src/flag.ts');
    });

    it('passes through ignore/allow/strict/cache from config', () => {
        const t = resolveEntry(
            {
                metadata: {
                    entryPoint: 'src/x.ts',
                    ignore: ['**/node_modules/**'],
                    allow: ['src/types/**'],
                    strict: 'throw',
                    cache: true,
                },
            },
            {},
            cwd,
        );
        expect(t.metadata.ignore).toEqual(['**/node_modules/**']);
        expect(t.metadata.allow).toEqual(['src/types/**']);
        expect(t.metadata.strict).toBe('throw');
        expect(t.metadata.cache).toBe(true);
    });

    it('CLI flags override metadata config fields', () => {
        const t = resolveEntry(
            {
                metadata: {
                    entryPoint: 'src/x.ts',
                    ignore: ['old'],
                    allow: ['old'],
                    strict: false,
                    cache: false,
                    preset: 'cfg-preset',
                    tsconfig: 'cfg.tsconfig.json',
                },
            },
            {
                ignore: ['new'],
                allow: ['new'],
                strict: 'throw',
                cache: true,
                preset: 'flag-preset',
                tsconfig: 'flag.tsconfig.json',
            },
            cwd,
        );
        expect(t.metadata.ignore).toEqual(['new']);
        expect(t.metadata.allow).toEqual(['new']);
        expect(t.metadata.strict).toBe('throw');
        expect(t.metadata.cache).toBe(true);
        expect(t.metadata.preset).toBe('flag-preset');
        expect(t.metadata.tsconfig).toBe('flag.tsconfig.json');
    });

    it('passes through swagger.data verbatim', () => {
        const t = resolveEntry(
            {
                metadata: { entryPoint: 'src/x.ts' },
                swagger: {
                    version: 'v3.2',
                    data: {
                        name: 'API',
                        servers: ['https://api.example.com'],
                        securityDefinitions: {
                            bearer: {
                                type: 'apiKey', 
                                name: 'Authorization', 
                                in: 'header', 
                            }, 
                        },
                    },
                },
            },
            {},
            cwd,
        );
        expect(t.swagger.version).toBe('v3.2');
        expect(t.swagger.data.name).toBe('API');
        expect(t.swagger.data.servers).toEqual(['https://api.example.com']);
        expect(t.swagger.data.securityDefinitions).toEqual({
            bearer: {
                type: 'apiKey', 
                name: 'Authorization', 
                in: 'header', 
            }, 
        });
    });

    it('CLI flags override swagger.data fields', () => {
        const t = resolveEntry(
            {
                metadata: { entryPoint: 'src/x.ts' },
                swagger: {
                    version: 'v3',
                    data: {
                        name: 'cfg',
                        version: '1.0.0',
                        description: 'cfg-desc',
                        servers: ['https://cfg'],
                    },
                },
            },
            {
                version: 'v3.1',
                name: 'flag',
                apiVersion: '2.0.0',
                description: 'flag-desc',
                servers: ['https://flag-1', 'https://flag-2'],
                securityDefinitions: { basic: { type: 'http', scheme: 'basic' } },
            },
            cwd,
        );
        expect(t.swagger.version).toBe('v3.1');
        expect(t.swagger.data.name).toBe('flag');
        expect(t.swagger.data.version).toBe('2.0.0');
        expect(t.swagger.data.description).toBe('flag-desc');
        expect(t.swagger.data.servers).toEqual([
            { url: 'https://flag-1' },
            { url: 'https://flag-2' },
        ]);
        expect(t.swagger.data.securityDefinitions).toEqual({ basic: { type: 'http', scheme: 'basic' } });
    });

    it('defaults version to v3 when not set anywhere', () => {
        const t = resolveEntry(
            { metadata: { entryPoint: 'src/x.ts' } },
            {},
            cwd,
        );
        expect(t.swagger.version).toBe('v3');
    });

    it('resolves relative output path against cwd', () => {
        const t = resolveEntry(
            { metadata: { entryPoint: 'src/x.ts' }, output: { path: 'dist/api.json' } },
            {},
            cwd,
        );
        expect(t.output.path).toBe(path.join(cwd, 'dist/api.json'));
    });

    it('keeps absolute output path verbatim', () => {
        const abs = path.resolve('/abs', 'output.yaml');
        const t = resolveEntry(
            { metadata: { entryPoint: 'src/x.ts' }, output: { path: abs } },
            {},
            cwd,
        );
        expect(t.output.path).toBe(abs);
    });

    it('falls back to swagger.json when no output is provided', () => {
        const t = resolveEntry(
            { metadata: { entryPoint: 'src/x.ts' } },
            {},
            cwd,
        );
        expect(t.output.path).toBe(path.join(cwd, 'swagger.json'));
    });

    it('CLI cwd flag wins over config cwd', () => {
        const flagCwd = path.resolve('/flag-cwd');
        const t = resolveEntry(
            { cwd: '/cfg-cwd', metadata: { entryPoint: 'src/x.ts' } },
            { cwd: flagCwd },
            cwd,
        );
        expect(t.cwd).toBe(flagCwd);
    });
});
