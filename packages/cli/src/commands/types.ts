import type { generateMetadata } from '@trapi/metadata';
import type { ResolvedTarget } from '../config';

import type { DocumentFormat } from '@trapi/swagger';

export type CleanCacheOptions = {
    directory: string;
    /** Only remove files older than this many ms. `undefined` removes all. */
    maxAgeMs?: number;
};

export type CleanCacheResult = {
    removed: number;
    skipped: number;
};

export type Metadata = Awaited<ReturnType<typeof generateMetadata>>;

export type GenerateArgs = Record<string, unknown>;

export type GenerateResult = {
    target: ResolvedTarget;
    output: { path: string };
};

export type ResolvedTargets = {
    cwd: string;
    configPath?: string;
    targets: ResolvedTarget[];
};

export type ResolvedOutput = {
    cwd: string;
    name: string;
    format: `${DocumentFormat}`;
};
