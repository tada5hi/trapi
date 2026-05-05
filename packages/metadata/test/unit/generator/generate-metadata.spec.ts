/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateMetadata } from '../../../src';
import { ConfigErrorCode } from '../../../src/core/error/config-codes';
import type { Preset, Registry } from '@trapi/core';
import { createRegistry } from '@trapi/core';

const entryPoint = [{
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
    pattern: './test/data/controllers/**/*.ts',
}];

describe('generateMetadata', () => {
    it('should accept options with tsconfig', async () => {
        const metadata = await generateMetadata({
            entryPoint,
            cache: false,
            preset: '@trapi/preset-decorators-express',
            tsconfig: undefined,
        });

        expect(metadata).toHaveProperty('controllers');
        expect(metadata).toHaveProperty('referenceTypes');
        expect(metadata.controllers.length).toBeGreaterThan(0);
    });

    it('should accept options without tsconfig', async () => {
        const metadata = await generateMetadata({
            entryPoint,
            cache: false,
            preset: '@trapi/preset-decorators-express',
        });

        expect(metadata).toHaveProperty('controllers');
        expect(metadata.controllers.length).toBeGreaterThan(0);
    });

    it('should accept an inline Preset object', async () => {
        const inline: Preset = {
            name: 'inline-fixture',
            extends: ['@trapi/preset-decorators-express'],
        };
        const metadata = await generateMetadata({
            entryPoint,
            cache: false,
            preset: inline,
        });

        expect(metadata.controllers.length).toBeGreaterThan(0);
    });

    it('should accept an inline Registry without any preset', async () => {
        // Minimal registry that only knows @Controller + @Get. We point at a
        // dedicated fixture with no parameter decorators so body-inference
        // doesn't conflict with the bare-bones registry.
        const registry: Registry = createRegistry({
            controllers: [{
                match: { name: 'Controller', on: 'class' },
                apply: (ctx, draft) => {
                    const arg = ctx.argument(0);
                    draft.paths = arg && arg.kind === 'literal' && typeof arg.raw === 'string' ?
                        [arg.raw] :
                        [''];
                },
            }],
            methods: [{
                match: { name: 'Get', on: 'method' },
                apply: (_ctx, draft) => { draft.verb = 'get'; },
            }],
        });

        const metadata = await generateMetadata({
            entryPoint: [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/inline-registry'),
                pattern: '**/*.ts',
            }],
            cache: false,
            registry,
        });

        expect(metadata.controllers.length).toBe(1);
        expect(metadata.controllers[0].paths).toEqual(['widgets']);
        expect(metadata.controllers[0].methods.length).toBe(1);
        expect(metadata.controllers[0].methods[0].method).toBe('get');
    });

    it('should merge an inline registry on top of a preset (registry wins on scalar fields)', async () => {
        // Inline parameter handler that overrides @Path to set a marker
        // description so we can detect that it ran after the preset's handler.
        const registry: Registry = createRegistry({
            parameters: [{
                match: { name: 'Path', on: 'parameter' },
                apply: (_ctx, draft) => { draft.description = 'inline-override'; },
            }],
        });

        const metadata = await generateMetadata({
            entryPoint,
            cache: false,
            preset: '@trapi/preset-decorators-express',
            registry,
        });

        const overridden = metadata.controllers
            .flatMap((c) => c.methods)
            .flatMap((m) => m.parameters)
            .filter((p) => p.description === 'inline-override');
        expect(overridden.length).toBeGreaterThan(0);
    });

    it('should throw when preset is omitted but source files contain decorators', async () => {
        // Real fixture controllers exist at the entryPoint, but no preset means
        // no handler can claim them. The orchestrator should fail loudly rather
        // than silently returning an empty controller list.
        await expect(
            generateMetadata({
                entryPoint,
                cache: false,
                // preset deliberately omitted
            }),
        ).rejects.toMatchObject({ code: ConfigErrorCode.PRESET_MISSING });
    });

    describe('strict mode', () => {
        let warnSpy: ReturnType<typeof vi.spyOn>;

        beforeEach(() => {
            warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        });
        afterEach(() => {
            warnSpy.mockRestore();
        });

        it('should not emit warnings when no decorators are unmatched', async () => {
            await generateMetadata({
                entryPoint,
                cache: false,
                preset: '@trapi/preset-decorators-express',
                strict: true,
            });
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('should warn about a typo (@Hiden vs @Hidden) on a fixture controller', async () => {
            await generateMetadata({
                entryPoint: [{
                    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/strict-typo'),
                    pattern: '**/*.ts',
                }],
                cache: false,
                preset: '@trapi/preset-decorators-express',
                strict: true,
            });

            expect(warnSpy).toHaveBeenCalledTimes(1);
            const message = warnSpy.mock.calls[0][0] as string;
            expect(message).toContain('@Hiden');
            expect(message).toContain('TypoController');
            // Real decorators on the same fixture should not surface as unmatched.
            expect(message).not.toContain('@Controller ');
            expect(message).not.toContain('@Get ');
        });

        it("should throw a GeneratorError when strict === 'throw'", async () => {
            const typoEntry = [{
                cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/strict-typo'),
                pattern: '**/*.ts',
            }];
            await expect(
                generateMetadata({
                    entryPoint: typoEntry,
                    cache: false,
                    preset: '@trapi/preset-decorators-express',
                    strict: 'throw',
                }),
            ).rejects.toMatchObject({ code: 'GENERATOR_STRICT_UNMATCHED_DECORATORS' });

            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('should invoke the onUnmatchedDecorator callback instead of warning', async () => {
            const reports: { name: string; line: number }[] = [];
            await generateMetadata({
                entryPoint: [{
                    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/strict-typo'),
                    pattern: '**/*.ts',
                }],
                cache: false,
                preset: '@trapi/preset-decorators-express',
                onUnmatchedDecorator: (received) => {
                    for (const r of received) {
                        reports.push({ name: r.name, line: r.line });
                    }
                },
            });

            expect(reports.map((r) => r.name)).toEqual(['Hiden']);
            expect(reports[0].line).toBeGreaterThan(0);
            // Callback short-circuits warn/throw.
            expect(warnSpy).not.toHaveBeenCalled();
        });

        it('callback wins over strict throw mode', async () => {
            const reports: string[] = [];
            // No throw despite strict: 'throw' because callback is terminal.
            await generateMetadata({
                entryPoint: [{
                    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../data/strict-typo'),
                    pattern: '**/*.ts',
                }],
                cache: false,
                preset: '@trapi/preset-decorators-express',
                strict: 'throw',
                onUnmatchedDecorator: (received) => {
                    for (const r of received) reports.push(r.name);
                },
            });
            expect(reports).toEqual(['Hiden']);
        });
    });
});
