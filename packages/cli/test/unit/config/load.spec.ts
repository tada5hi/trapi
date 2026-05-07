/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { 
    afterEach, 
    beforeEach, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { loadConfig } from '../../../src/config/load.ts';
import { CLIUserError } from '../../../src/logger.ts';

describe('loadConfig', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trapi-cli-config-'));
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    it('returns empty entries when no config exists', async () => {
        const result = await loadConfig({ cwd: dir });
        expect(result.entries).toEqual([]);
        expect(result.path).toBeUndefined();
    });

    it('skips discovery when disabled', async () => {
        await fs.writeFile(
            path.join(dir, 'trapi.config.json'),
            JSON.stringify({ metadata: { entryPoint: 'src/**/*.ts' } }),
        );
        const result = await loadConfig({ cwd: dir, disabled: true });
        expect(result.entries).toEqual([]);
        expect(result.path).toBeUndefined();
    });

    it('loads a JSON config file from cwd', async () => {
        const cfgPath = path.join(dir, 'trapi.config.json');
        await fs.writeFile(
            cfgPath,
            JSON.stringify({ metadata: { entryPoint: 'src/api.ts' } }),
        );
        const result = await loadConfig({ cwd: dir });
        expect(result.path).toBe(cfgPath);
        expect(result.entries).toHaveLength(1);
        expect(result.entries[0]?.metadata?.entryPoint).toBe('src/api.ts');
    });

    it('loads an array (multi-target) config', async () => {
        await fs.writeFile(
            path.join(dir, 'trapi.config.json'),
            JSON.stringify([
                { metadata: { entryPoint: 'src/a.ts' } },
                { metadata: { entryPoint: 'src/b.ts' } },
            ]),
        );
        const result = await loadConfig({ cwd: dir });
        expect(result.entries).toHaveLength(2);
        expect(result.entries[0]?.metadata?.entryPoint).toBe('src/a.ts');
        expect(result.entries[1]?.metadata?.entryPoint).toBe('src/b.ts');
    });

    it('honours an explicit configPath', async () => {
        const cfgPath = path.join(dir, 'custom.json');
        await fs.writeFile(
            cfgPath,
            JSON.stringify({ metadata: { entryPoint: 'src/custom.ts' } }),
        );
        const result = await loadConfig({ cwd: dir, configPath: cfgPath });
        expect(result.path).toBe(cfgPath);
        expect(result.entries[0]?.metadata?.entryPoint).toBe('src/custom.ts');
    });

    it('throws CLIUserError when explicit configPath is missing', async () => {
        await expect(
            loadConfig({ cwd: dir, configPath: path.join(dir, 'nope.json') }),
        ).rejects.toBeInstanceOf(CLIUserError);
    });

    it('reads package.json#trapi when no dedicated config file exists', async () => {
        const pkgPath = path.join(dir, 'package.json');
        await fs.writeFile(
            pkgPath,
            JSON.stringify({
                name: 'fixture',
                trapi: { metadata: { entryPoint: 'src/pkg.ts' } },
            }),
        );
        const result = await loadConfig({ cwd: dir });
        expect(result.path).toBe(pkgPath);
        expect(result.entries[0]?.metadata?.entryPoint).toBe('src/pkg.ts');
    });

    it('prefers a dedicated config file over package.json#trapi', async () => {
        const cfgPath = path.join(dir, 'trapi.config.json');
        await fs.writeFile(
            cfgPath,
            JSON.stringify({ metadata: { entryPoint: 'src/dedicated.ts' } }),
        );
        await fs.writeFile(
            path.join(dir, 'package.json'),
            JSON.stringify({ trapi: { metadata: { entryPoint: 'src/from-pkg.ts' } } }),
        );
        const result = await loadConfig({ cwd: dir });
        expect(result.path).toBe(cfgPath);
        expect(result.entries[0]?.metadata?.entryPoint).toBe('src/dedicated.ts');
    });

    it('throws CLIUserError on invalid (non-object) config', async () => {
        await fs.writeFile(path.join(dir, 'trapi.config.json'), '"a string"');
        await expect(loadConfig({ cwd: dir })).rejects.toBeInstanceOf(CLIUserError);
    });

    it('throws CLIUserError on malformed package.json', async () => {
        await fs.writeFile(path.join(dir, 'package.json'), '{ this is not json');
        await expect(loadConfig({ cwd: dir })).rejects.toBeInstanceOf(CLIUserError);
    });
});
