/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import {
    buildFilePath,
    locate,
    read,
} from 'locter';
import { isObject } from 'smob';
import { CLIUserError } from '../logger.ts';
import type { LoadedConfig, TrapiConfigEntry } from './types.ts';

const CONFIG_FILE_PATTERN = 'trapi.config.{ts,mts,cts,mjs,cjs,js,json}';

export type LoadConfigOptions = {
    cwd: string;
    /** Explicit config path from `--config`. Skips discovery. */
    configPath?: string;
    /** When `true`, do not attempt discovery; returns an empty result. */
    disabled?: boolean;
};

export async function loadConfig(options: LoadConfigOptions): Promise<LoadedConfig> {
    if (options.disabled) {
        return { entries: [] };
    }

    const explicit = options.configPath;
    if (explicit) {
        const resolved = path.isAbsolute(explicit) ?
            explicit :
            path.resolve(options.cwd, explicit);
        await assertReadable(resolved);
        return readConfigFile(resolved);
    }

    const found = await locate(CONFIG_FILE_PATTERN, {
        cwd: options.cwd,
        onlyFiles: true,
    });
    if (found) {
        return readConfigFile(buildFilePath(found));
    }

    const fromPackageJson = await readPackageJsonField(options.cwd);
    if (fromPackageJson) {
        return fromPackageJson;
    }

    return { entries: [] };
}

async function readConfigFile(filePath: string): Promise<LoadedConfig> {
    let mod: unknown;
    try {
        mod = await read(filePath);
    } catch (err) {
        throw new CLIUserError(
            `Failed to load config "${filePath}": ${err instanceof Error ? err.message : String(err)}`,
        );
    }

    const value = unwrapDefault(mod);
    return { path: filePath, entries: normalizeEntries(value, filePath) };
}

async function readPackageJsonField(cwd: string): Promise<LoadedConfig | undefined> {
    const pkgPath = path.join(cwd, 'package.json');
    let raw: string;
    try {
        raw = await fs.readFile(pkgPath, 'utf-8');
    } catch {
        return undefined;
    }

    let parsed: { trapi?: unknown };
    try {
        parsed = JSON.parse(raw) as { trapi?: unknown };
    } catch (err) {
        throw new CLIUserError(
            `Failed to parse "${pkgPath}": ${err instanceof Error ? err.message : String(err)}`,
        );
    }

    if (parsed.trapi === undefined) {
        return undefined;
    }

    return { path: pkgPath, entries: normalizeEntries(parsed.trapi, pkgPath) };
}

async function assertReadable(filePath: string): Promise<void> {
    try {
        await fs.access(filePath);
    } catch {
        throw new CLIUserError(`Config file not found: ${filePath}`);
    }
}

function unwrapDefault(mod: unknown): unknown {
    if (isObject(mod) && 'default' in mod) {
        return mod.default;
    }

    return mod;
}

function normalizeEntries(value: unknown, source: string): TrapiConfigEntry[] {
    if (Array.isArray(value)) {
        value.forEach((entry, idx) => assertEntry(entry, `${source} (entry ${idx})`));
        return value as TrapiConfigEntry[];
    }
    assertEntry(value, source);
    return [value as TrapiConfigEntry];
}

function assertEntry(value: unknown, where: string): void {
    if (!value || typeof value !== 'object') {
        throw new CLIUserError(
            `Config from "${where}" must be an object (or an array of objects).`,
        );
    }
}

export function defaultConfigCwd(loaded: LoadedConfig, fallbackCwd: string): string {
    if (loaded.path) {
        return path.dirname(loaded.path);
    }
    return fallbackCwd;
}
