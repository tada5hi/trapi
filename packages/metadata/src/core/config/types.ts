/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CacheOptions } from '../../adapters/cache';
import type { Preset, Registry, UnmatchedDecoratorReport } from '../../adapters/decorator';
import type { TsConfig } from '../../adapters/filesystem/tsconfig';

export type EntryPointOptions = {
    cwd: string,
    pattern: string
};

export type EntryPoint = string | string[] | EntryPointOptions | EntryPointOptions[];

export type MetadataGeneratorOptions = {
    /**
     * The entry point to your API.
     */
    entryPoint: EntryPoint;

    /**
     * Directory to ignore during TypeScript files scan.
     * Default: []
     */
    ignore?: string[];

    /**
     * Directory to allow during TypeScript files scan.
     * Default: []
     */
    allow?: string[],

    /**
     * Directory to store and cache metadata cache files.
     * Default: false
     */
    cache?: string | boolean | Partial<CacheOptions>;

    /**
     * Decorator preset to load. Either:
     * - a string identifier resolved via {@link resolvePresetByName}
     *   (npm package, relative path, or `module:` specifier), or
     * - an inline {@link Preset} object (still walked through `loadRegistry`,
     *   so its `extends` chain — if any — is resolved by name).
     *
     * If both `preset` and `registry` are provided, the resolved preset
     * registry comes first and the inline `registry` is appended after.
     * Inline handlers therefore run last (winning on scalar mutations like
     * `into('path')`) and additively contribute on `append`-style fields.
     */
    preset?: string | Preset;

    /**
     * An already-resolved decorator {@link Registry}. Use this to wire
     * decorator handlers manually without authoring a full {@link Preset}.
     *
     * If provided alongside `preset`, the registry is appended to the
     * preset-derived registry (preset first, registry second). Inline
     * handlers cannot carry `replaces` semantics — those are enforced at
     * preset-load time. To remove a preset handler, author a `Preset` with
     * `replaces` and pass it via `preset` instead.
     */
    registry?: Registry;

    /**
     * Controls how unmatched decorators (decorators with no matching handler
     * in the resolved registry) are surfaced.
     *
     * - `false` / unset (default): silent.
     * - `true`: emit a single `console.warn` listing every unmatched decorator
     *   at the end of generation. Useful for catching typos (e.g. `@Hiden`
     *   instead of `@Hidden`) and unwired decorators in custom presets.
     * - `'throw'`: throw a `GeneratorError` instead of warning. Useful as a
     *   CI gate.
     *
     * If `onUnmatchedDecorator` is also set, the callback is invoked instead
     * of warning/throwing — collection still happens, but reporting is yours.
     *
     * Note: JSDoc tags are not currently included in strict-mode reporting
     * because standard documentation tags (`@param`, `@returns`, ...) would
     * generate excessive noise.
     */
    strict?: boolean | 'throw';

    /**
     * Optional callback invoked at the end of generation with all unmatched-
     * decorator reports collected during the run. Replaces the default
     * `console.warn` / `throw` behaviour of `strict` — when set, the callback
     * is the terminal step (no warn, no throw).
     *
     * Setting this implicitly enables collection — you don't also need to set
     * `strict`.
     */
    onUnmatchedDecorator?: (reports: UnmatchedDecoratorReport[]) => void;
};

export type MetadataGenerateOptions = MetadataGeneratorOptions & {
    /**
     * Path to tsconfig.json or a TsConfig object.
     */
    tsconfig?: string | TsConfig;
};
