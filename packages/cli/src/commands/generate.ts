/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import { defineCommand } from 'citty';
import type { MetadataGenerateOptions } from '@trapi/metadata';
import { generateMetadata } from '@trapi/metadata';
import type { DocumentFormat } from '@trapi/swagger';
import { generateSwagger, saveSwagger } from '@trapi/swagger';
import type {
    GenerateFlags,
    ResolvedTarget,
    TrapiConfigEntry,
} from '../config';
import {
    defaultConfigCwd,
    loadConfig,
    resolveEntry,
} from '../config';
import {
    LOG_LEVEL_VALUES,
    createLogger,
    normalizeLogLevel,
} from '../logger.ts';
import { runWithExitCode } from '../exit.ts';
import {
    FORMAT_VALUES,
    VERSION_VALUES,
    normalizeVersion,
    parseSecurityDefinitions,
    parseStrict,
    splitCsv,
    splitOutputPath,
} from './utils.ts';

type Metadata = Awaited<ReturnType<typeof generateMetadata>>;

export const GENERATE_ARGS = {
    'entry-point': {
        type: 'string',
        description: 'Glob pattern matching the source files to scan.',
        valueHint: 'src/**/*.ts',
    },
    preset: {
        type: 'string',
        description: 'Preset to load (npm package name or local path).',
        valueHint: '@trapi/preset-decorators-express',
    },
    tsconfig: {
        type: 'string',
        description: 'Path to a tsconfig.json file used to compile the sources.',
    },
    output: {
        type: 'string',
        description: 'Output file path. Extension picks the format unless --format is set.',
        valueHint: 'docs/openapi.json',
    },
    format: {
        type: 'string',
        description: 'Output document format.',
        valueHint: FORMAT_VALUES.join('|'),
        options: FORMAT_VALUES as string[],
    },
    version: {
        type: 'string',
        description: 'OpenAPI specification version.',
        valueHint: VERSION_VALUES.join('|'),
    },
    strict: {
        type: 'string',
        description: 'Warn (true) or throw on decorators that no preset handler matched.',
        valueHint: 'true|false|throw',
    },
    cache: {
        type: 'boolean',
        description: 'Cache the generated metadata between runs (off by default).',
    },
    ignore: {
        type: 'string',
        description: 'Comma-separated globs to skip during the source-file scan.',
        valueHint: '**/node_modules/**,**/*.spec.ts',
    },
    allow: {
        type: 'string',
        description: 'Comma-separated globs to include during the source-file scan.',
        valueHint: 'src/types/**',
    },
    servers: {
        type: 'string',
        description: 'Comma-separated server URLs written into spec.servers.',
        valueHint: 'https://api.example.com',
    },
    'security-definitions': {
        type: 'string',
        description: 'JSON string of security scheme definitions (matches SwaggerGenerateData.securityDefinitions).',
        valueHint: '{"bearer":{"type":"apiKey",...}}',
    },
    'api-name': {
        type: 'string',
        description: 'API name written into the spec info object.',
    },
    'api-version': {
        type: 'string',
        description: 'API version written into the spec info object.',
    },
    'api-description': {
        type: 'string',
        description: 'API description written into the spec info object.',
    },
    cwd: {
        type: 'string',
        description: 'Working directory. Relative paths in config + flags are resolved against it.',
    },
    config: {
        type: 'string',
        description: 'Path to a trapi config file. Disables discovery.',
        valueHint: 'trapi.config.ts',
    },
    'no-config': {
        type: 'boolean',
        description: 'Skip config file discovery and ignore --config.',
        default: false,
    },
    'log-level': {
        type: 'string',
        description: 'Logger verbosity.',
        valueHint: LOG_LEVEL_VALUES.join('|'),
        options: LOG_LEVEL_VALUES as string[],
    },
} as const;

export function defineCLIGenerateCommand() {
    return defineCommand({
        meta: {
            name: 'generate',
            description: 'Generate an OpenAPI / Swagger specification from decorated TypeScript sources.',
        },
        args: GENERATE_ARGS,
        async run({ args }) {
            const logger = createLogger(normalizeLogLevel(args['log-level'] as string | undefined));
            await runWithExitCode(logger, async () => {
                await runGenerate(args, logger);
            });
        },
    });
}

export type GenerateArgs = Record<string, unknown>;

export type GenerateResult = {
    target: ResolvedTarget;
    output: { path: string };
};

export async function runGenerate(
    args: GenerateArgs,
    logger = createLogger(),
): Promise<GenerateResult[]> {
    const flags = parseFlags(args);
    const cwd = flags.cwd ?? process.cwd();

    const loaded = await loadConfig({
        cwd,
        configPath: typeof args.config === 'string' ? args.config : undefined,
        disabled: args['no-config'] === true,
    });

    if (loaded.path) {
        logger.debug(`loaded config from ${loaded.path}`);
    } else {
        logger.debug('no config file found; using CLI flags only');
    }

    const entries: TrapiConfigEntry[] = loaded.entries.length > 0 ? loaded.entries : [{}];
    const fallbackCwd = defaultConfigCwd(loaded);

    const targets = entries.map((entry) => resolveEntry(entry, flags, fallbackCwd));
    logger.debug(`resolved ${targets.length} target(s)`);

    const start = Date.now();
    const results = await runTargets(targets, logger);
    logger.success(`done in ${Date.now() - start}ms`);
    return results;
}

async function runTargets(targets: ResolvedTarget[], logger: ReturnType<typeof createLogger>): Promise<GenerateResult[]> {
    const groups = groupByMetadataSignature(targets);
    const results: GenerateResult[] = [];

    for (const group of groups) {
        const metadata = await generateMetadata(group.metadataOptions);
        logger.debug(
            `metadata: ${metadata.controllers.length} controller(s), ${Object.keys(metadata.referenceTypes).length} reference type(s)`,
        );

        for (const target of group.targets) {
            const result = await emitOne(target, metadata, logger);
            results.push(result);
        }
    }

    return results;
}

async function emitOne(
    target: ResolvedTarget,
    metadata: Metadata,
    logger: ReturnType<typeof createLogger>,
): Promise<GenerateResult> {
    const spec = await generateSwagger({
        version: target.swagger.version,
        metadata,
        data: target.swagger.data,
    });
    const split = splitOutputPath(target.output.path, target.output.format);
    const written = await saveSwagger(spec, {
        cwd: split.cwd,
        name: split.name,
        format: split.format,
    });
    logger.info(`wrote ${written.path} (${target.swagger.version})`);
    return { target, output: { path: written.path } };
}

type MetadataGroup = {
    metadataOptions: MetadataGenerateOptions;
    targets: ResolvedTarget[];
};

function groupByMetadataSignature(targets: ResolvedTarget[]): MetadataGroup[] {
    const groups = new Map<string, MetadataGroup>();

    for (const target of targets) {
        const key = signatureFor(target.metadata);
        const existing = groups.get(key);
        if (existing) {
            existing.targets.push(target);
        } else {
            groups.set(key, { metadataOptions: target.metadata, targets: [target] });
        }
    }

    return [...groups.values()];
}

function signatureFor(opts: MetadataGenerateOptions): string {
    return JSON.stringify({
        entryPoint: opts.entryPoint,
        preset: typeof opts.preset === 'string' ? opts.preset : '<inline-preset>',
        tsconfig: typeof opts.tsconfig === 'string' ? opts.tsconfig : '<inline-tsconfig>',
        ignore: opts.ignore ?? null,
        allow: opts.allow ?? null,
        cache: opts.cache ?? null,
        strict: opts.strict ?? null,
        registry: opts.registry ? '<inline-registry>' : null,
    });
}

function parseFlags(args: GenerateArgs): GenerateFlags {
    const entryPointRaw = args['entry-point'];
    const entryPoint = typeof entryPointRaw === 'string' ? entryPointRaw : undefined;

    const versionRaw = args.version;
    const version = typeof versionRaw === 'string' ? normalizeVersion(versionRaw) : undefined;

    return {
        cwd: typeof args.cwd === 'string' ? args.cwd : undefined,
        entryPoint,
        preset: typeof args.preset === 'string' ? args.preset : undefined,
        tsconfig: typeof args.tsconfig === 'string' ? args.tsconfig : undefined,
        ignore: splitCsv(typeof args.ignore === 'string' ? args.ignore : undefined),
        allow: splitCsv(typeof args.allow === 'string' ? args.allow : undefined),
        strict: parseStrict(typeof args.strict === 'string' ? args.strict : undefined),
        cache: typeof args.cache === 'boolean' ? args.cache : undefined,
        output: typeof args.output === 'string' ? args.output : undefined,
        format: typeof args.format === 'string' ? (args.format as `${DocumentFormat}`) : undefined,
        version,
        name: typeof args['api-name'] === 'string' ? (args['api-name'] as string) : undefined,
        apiVersion: typeof args['api-version'] === 'string' ? (args['api-version'] as string) : undefined,
        description: typeof args['api-description'] === 'string' ? (args['api-description'] as string) : undefined,
        servers: splitCsv(typeof args.servers === 'string' ? args.servers : undefined),
        securityDefinitions: parseSecurityDefinitions(
            typeof args['security-definitions'] === 'string' ? (args['security-definitions'] as string) : undefined,
        ) as GenerateFlags['securityDefinitions'],
    };
}
