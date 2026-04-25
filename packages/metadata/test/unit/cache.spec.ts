/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    describe,
    expect,
    it,
} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CacheClient } from '../../src';

describe('src/cache', () => {
    describe('save and get', () => {
        it('should save cache and retrieve it', async () => {
            const cache = new CacheClient();

            const cachePath: string = await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 0,
            });

            expect(cachePath).toBeDefined();
            expect(fs.existsSync(cachePath)).toBeTruthy();

            const output = await cache.get(0);

            expect(output).toBeDefined();
            expect(output).toHaveProperty('controllers');
            expect(output).toHaveProperty('referenceTypes');
            expect(output).toHaveProperty('sourceFilesSize');
        });

        it('should save metadata with controllers and reference types', async () => {
            const cache = new CacheClient();

            const testData = {
                controllers: [{
                    consumes: [],
                    extensions: [],
                    hidden: false,
                    location: '/test.ts',
                    methods: [],
                    name: 'TestController',
                    path: 'test',
                    produces: [],
                    responses: [],
                    security: [],
                    tags: [],
                }],
                referenceTypes: {
                    TestType: {
                        typeName: 'refObject' as const,
                        refName: 'TestType',
                        properties: [],
                        deprecated: false,
                    },
                },
                sourceFilesSize: 42,
            };

            await cache.save(testData);
            const output = await cache.get(42);

            expect(output).toBeDefined();
            expect(output!.controllers).toHaveLength(1);
            expect(output!.controllers[0].name).toEqual('TestController');
            expect(output!.referenceTypes).toHaveProperty('TestType');
            expect(output!.sourceFilesSize).toEqual(42);
        });

        it('should return different cache for different sourceFilesSize', async () => {
            const cache = new CacheClient();

            await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 10,
            });

            await cache.save({
                controllers: [{
                    consumes: [],
                    extensions: [],
                    hidden: false,
                    location: '/a.ts',
                    methods: [],
                    name: 'A',
                    path: 'a',
                    produces: [],
                    responses: [],
                    security: [],
                    tags: [],
                }],
                referenceTypes: {},
                sourceFilesSize: 20,
            });

            const output10 = await cache.get(10);
            const output20 = await cache.get(20);

            expect(output10).toBeDefined();
            expect(output10!.controllers).toHaveLength(0);

            expect(output20).toBeDefined();
            expect(output20!.controllers).toHaveLength(1);
        });
    });

    describe('disabled cache', () => {
        it('should not save when disabled with false', async () => {
            const cache = new CacheClient(false);

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 0,
            });

            expect(cachePath).toBeUndefined();
        });

        it('should not get when disabled', async () => {
            const cache = new CacheClient(false);
            const output = await cache.get(0);
            expect(output).toBeUndefined();
        });

        it('should not save when disabled with options object', async () => {
            const cache = new CacheClient({ enabled: false });

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 0,
            });

            expect(cachePath).toBeUndefined();
        });
    });

    describe('cache miss', () => {
        it('should return undefined for non-existent cache file', async () => {
            const cache = new CacheClient({
                enabled: true,
                directoryPath: os.tmpdir(),
            });

            // Use a sourceFilesSize that hasn't been saved
            const output = await cache.get(999999);
            expect(output).toBeUndefined();
        });

        it('should return undefined when sourceFilesSize does not match', async () => {
            const cache = new CacheClient();

            await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 100,
            });

            // Try to get with a different sourceFilesSize
            const output = await cache.get(200);
            expect(output).toBeUndefined();
        });
    });

    describe('constructor options', () => {
        it('should accept string as directory path', async () => {
            const dirPath = path.join(os.tmpdir(), 'trapi-cache-test-str');
            await fs.promises.mkdir(dirPath, { recursive: true });

            const cache = new CacheClient(dirPath);

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 0,
            });

            expect(cachePath).toBeDefined();
            expect(cachePath!.startsWith(dirPath)).toBe(true);

            // Cleanup
            try {
                await fs.promises.unlink(cachePath!);
                await fs.promises.rmdir(dirPath);
            } catch {
                // ignore cleanup errors
            }
        });

        it('should accept boolean true to enable', async () => {
            const cache = new CacheClient(true);

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 0,
            });

            expect(cachePath).toBeDefined();
        });

        it('should accept options object with custom fileName', async () => {
            const dirPath = path.join(os.tmpdir(), 'trapi-cache-test-fn');
            await fs.promises.mkdir(dirPath, { recursive: true });

            const cache = new CacheClient({
                enabled: true,
                directoryPath: dirPath,
                fileName: 'custom-cache.json',
            });

            const cachePath = await cache.save({
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 0,
            });

            expect(cachePath).toBeDefined();
            expect(cachePath!.endsWith('custom-cache.json')).toBe(true);

            // Cleanup
            try {
                await fs.promises.unlink(cachePath!);
                await fs.promises.rmdir(dirPath);
            } catch {
                // ignore cleanup errors
            }
        });
    });

    describe('serialization', () => {
        it('should handle circular references in metadata objects', async () => {
            const cache = new CacheClient();

            // The serialize method should handle circular refs gracefully
            const data: any = {
                controllers: [],
                referenceTypes: {},
                sourceFilesSize: 0,
            };
            // Create a circular reference
            data.self = data;

            const cachePath = await cache.save(data);
            expect(cachePath).toBeDefined();

            // The circular ref should be stripped during serialization
            const output = await cache.get(0);
            expect(output).toBeDefined();
            expect((output as any).self).toBeUndefined();
        });
    });
});
