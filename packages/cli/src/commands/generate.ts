/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import type { MetadataGenerateOptions } from '@trapi/metadata';
import type { SwaggerGenerateOptions } from '@trapi/swagger';
import {
    Version,
    generateSwagger,
    saveSwagger,
} from '@trapi/swagger';
import {
    FORMAT_VALUES,
    VERSION_VALUES,
    normalizeVersion,
    resolveOutput,
} from './utils.ts';

export function defineCLIGenerateCommand() {
    return defineCommand({
        meta: {
            name: 'generate',
            description: 'Generate an OpenAPI / Swagger specification from decorated TypeScript sources.',
        },
        args: {
            'entry-point': {
                type: 'string',
                description: 'Glob pattern matching the source files to scan.',
                valueHint: 'src/**/*.ts',
                required: true,
            },
            preset: {
                type: 'string',
                description: 'Preset to load (npm package name or local path).',
                valueHint: '@trapi/decorators',
            },
            tsconfig: {
                type: 'string',
                description: 'Path to a tsconfig.json file used to compile the sources.',
            },
            output: {
                type: 'string',
                description: 'Output file path. Extension picks the format unless --format is set.',
                valueHint: 'docs/openapi.json',
                default: 'swagger.json',
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
                default: Version.V3,
            },
            strict: {
                type: 'boolean',
                description: 'Warn on decorators that no preset handler matched.',
                default: false,
            },
            cache: {
                type: 'boolean',
                description: 'Cache the generated metadata between runs (off by default).',
                default: false,
            },
            name: {
                type: 'string',
                description: 'API name written into the spec info object.',
            },
            'api-version': {
                type: 'string',
                description: 'API version written into the spec info object.',
            },
            description: {
                type: 'string',
                description: 'API description written into the spec info object.',
            },
        },
        async run({ args }) {
            const version = normalizeVersion(String(args.version));
            const output = resolveOutput(
                args.output as string | undefined,
                args.format as string | undefined,
            );

            const metadata: MetadataGenerateOptions = {
                entryPoint: args['entry-point'] as string,
                preset: args.preset as string | undefined,
                tsconfig: args.tsconfig as string | undefined,
                strict: args.strict ? true : undefined,
                cache: args.cache ? true : undefined,
            };

            const swaggerOptions: SwaggerGenerateOptions = {
                version,
                metadata,
                data: {
                    name: args.name as string | undefined,
                    version: args['api-version'] as string | undefined,
                    description: args.description as string | undefined,
                },
            };

            const spec = await generateSwagger(swaggerOptions);
            const result = await saveSwagger(spec, {
                cwd: output.cwd,
                name: output.name,
                format: output.format,
            });

            // eslint-disable-next-line no-console
            console.log(`[trapi] wrote ${result.path}`);
        },
    });
}
