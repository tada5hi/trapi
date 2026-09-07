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
    vi,
} from 'vitest';
import { emitOne, runTargets } from '../../../src/commands/generate.ts';
import type { ResolvedTarget } from '../../../src/config/merge.ts';
import type { SwaggerTransform } from '../../../src/config/types.ts';
import { LogLevel, createLogger } from '../../../src/logger.ts';

const metadata = { controllers: [], referenceTypes: {} };
const logger = createLogger(LogLevel.Silent);

const generateMetadataMock = vi.hoisted(() => vi.fn());
vi.mock('@trapi/metadata', () => ({ generateMetadata: generateMetadataMock }));

describe('emitOne', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trapi-cli-emit-'));
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    const outPath = () => path.join(dir, 'openapi.json');

    const makeTarget = (transform?: SwaggerTransform): ResolvedTarget => ({
        cwd: dir,
        metadata: { entryPoint: 'src/x.ts' },
        swagger: {
            version: 'v3', 
            data: { name: 'API' }, 
            transform, 
        },
        output: { path: outPath() },
    });

    const readOutput = async (): Promise<Record<string, any>> => JSON.parse(
        await fs.readFile(outPath(), 'utf-8'),
    );

    it('writes the generated document unchanged when no transform is configured', async () => {
        await emitOne(makeTarget(), metadata, logger);

        const parsed = await readOutput();
        expect(parsed.openapi).toBe('3.0.0');
        expect(parsed.info.title).toBe('API');
        expect(parsed.paths).toEqual({});
    });

    it('passes the generated document to the transform', async () => {
        let received: Record<string, any> | undefined;
        await emitOne(makeTarget((spec) => {
            received = spec;
        }), metadata, logger);

        expect(received).toBeDefined();
        expect(received!.openapi).toBe('3.0.0');
        expect(received!.info.title).toBe('API');
        expect(received!.paths).toEqual({});
    });

    it('writes the object returned by the transform', async () => {
        await emitOne(makeTarget((spec) => ({ ...spec, 'x-replaced': true })), metadata, logger);

        const parsed = await readOutput();
        expect(parsed['x-replaced']).toBe(true);
        expect(parsed.openapi).toBe('3.0.0');
    });

    it('keeps in-place mutations when the transform returns nothing', async () => {
        await emitOne(makeTarget((spec) => {
            spec['x-mutated'] = 1;
        }), metadata, logger);

        const parsed = await readOutput();
        expect(parsed['x-mutated']).toBe(1);
        expect(parsed.openapi).toBe('3.0.0');
    });

    it('awaits an async transform before writing', async () => {
        await emitOne(makeTarget(async (spec) => {
            await new Promise((resolve) => {
                setTimeout(resolve, 10);
            });
            spec['x-async'] = true;
        }), metadata, logger);

        const parsed = await readOutput();
        expect(parsed['x-async']).toBe(true);
    });

    it('does not write the output file when the transform throws', async () => {
        const target = makeTarget(() => {
            throw new Error('boom');
        });

        await expect(emitOne(target, metadata, logger)).rejects.toThrow('boom');
        await expect(fs.access(outPath())).rejects.toThrow();
    });

    it('leaves a pre-existing output file untouched when the transform throws', async () => {
        await fs.writeFile(outPath(), '{"old":true}', 'utf-8');
        const target = makeTarget(() => {
            throw new Error('boom');
        });

        await expect(emitOne(target, metadata, logger)).rejects.toThrow('boom');
        expect(await fs.readFile(outPath(), 'utf-8')).toBe('{"old":true}');
    });
});

describe('runTargets', () => {
    let dir: string;

    beforeEach(async () => {
        dir = await fs.mkdtemp(path.join(os.tmpdir(), 'trapi-cli-run-'));
        generateMetadataMock.mockReset();
        generateMetadataMock.mockResolvedValue(metadata);
    });

    afterEach(async () => {
        await fs.rm(dir, { recursive: true, force: true });
    });

    const makeTarget = (
        entryPoint: string,
        name: string,
        transform?: SwaggerTransform,
    ): ResolvedTarget => ({
        cwd: dir,
        metadata: { entryPoint },
        swagger: {
            version: 'v3',
            data: { name },
            transform,
        },
        output: { path: path.join(dir, `${name}.json`) },
    });

    const exists = async (name: string) => fs.access(path.join(dir, `${name}.json`))
        .then(() => true, () => false);

    it('emits targets in config order and extracts metadata once per signature', async () => {
        const results = await runTargets([
            makeTarget('a/**/*.ts', 'a3'),
            makeTarget('b/**/*.ts', 'b'),
            makeTarget('a/**/*.ts', 'a2'),
        ], logger);

        expect(results.map((result) => path.basename(result.output.path)))
            .toEqual(['a3.json', 'b.json', 'a2.json']);
        expect(generateMetadataMock).toHaveBeenCalledTimes(2);
        expect(generateMetadataMock.mock.calls.map(([options]) => options.entryPoint))
            .toEqual(['a/**/*.ts', 'b/**/*.ts']);
    });

    it('leaves earlier targets written when a later transform throws', async () => {
        await expect(runTargets([
            makeTarget('a/**/*.ts', 'a3'),
            makeTarget('b/**/*.ts', 'b'),
            makeTarget('a/**/*.ts', 'a2', () => {
                throw new Error('boom');
            }),
        ], logger)).rejects.toThrow('boom');

        expect(await exists('a3')).toBe(true);
        expect(await exists('b')).toBe(true);
        expect(await exists('a2')).toBe(false);
    });
});
