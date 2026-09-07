# @trapi/cli ⚡

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fcli.svg)](https://badge.fury.io/js/@trapi%2Fcli)

A command-line wrapper around [`@trapi/metadata`](../metadata) and [`@trapi/swagger`](../swagger). Point it at your sources and it emits an OpenAPI / Swagger document — config-file driven for non-trivial setups, single-flag invocations for quick scripts.

Built on [citty](https://github.com/unjs/citty) — `--help` is wired up automatically and arguments are validated up-front.

**Table of Contents**

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration File](#configuration-file)
  - [Post-processing the document](#post-processing-the-document)
- [Commands](#commands)
  - [generate](#trapi-generate)
  - [watch](#trapi-watch)
  - [info](#trapi-info)
  - [cache clean](#trapi-cache-clean)
- [Programmatic Usage](#programmatic-usage)
- [Structure](#structure)
- [License](#license)

## Installation

```bash
npm install --save-dev @trapi/cli
```

The CLI ships a `trapi` bin. Install it in the project that owns the controllers — `@trapi/metadata` and `@trapi/swagger` are pulled in transitively, but you'll typically also install the preset you want to use (e.g. `@trapi/preset-decorators-express` or `@trapi/preset-typescript-rest`).

## Quick Start

```bash
npx trapi generate \
  --preset @trapi/preset-decorators-express \
  --entry-point 'src/**/*.ts' \
  --output docs/openapi.json \
  --version 3.1
```

The example above:

1. Loads the [`@trapi/preset-decorators-express`](../preset-decorators-express) preset.
2. Scans every `.ts` file under `src/` for decorated controllers.
3. Generates an OpenAPI **3.1** document.
4. Writes it to `docs/openapi.json` (the `.json` extension picks the format automatically).

Pass `--format yaml` or use a `.yaml`/`.yml` extension to emit YAML instead. Both `--version 3.1` and `--version v3.1` are accepted.

## Configuration File

Anything beyond a one-liner is easier in a config file. The CLI auto-discovers `trapi.config.{ts,mts,cts,mjs,cjs,js,json}` (or a `trapi` field in `package.json`) in the working directory.

```typescript
// trapi.config.ts
import { defineConfig } from '@trapi/cli';

export default defineConfig({
    metadata: {
        entryPoint: 'src/controllers/**/*.ts',
        preset: '@trapi/preset-decorators-express',
        tsconfig: 'tsconfig.json',
        ignore: ['**/*.spec.ts'],
        cache: true,
    },
    swagger: {
        version: 'v3.2',
        data: {
            name: 'My API',
            servers: ['https://api.example.com'],
            securityDefinitions: {
                bearer: { type: 'apiKey', name: 'Authorization', in: 'header' },
            },
        },
    },
    output: {
        path: 'docs/openapi.json',
    },
});
```

`defineConfig` is an identity helper — pass any `TrapiConfig` and you get IDE autocompletion + type checking. The shape mirrors the underlying option types (`MetadataGenerateOptions`, `SwaggerGenerateData`, `DocumentFormat`), so anything those accept is reachable from config. Not every field has a CLI flag — `swagger.data.extra`, `consumes`/`produces` and `collectionFormat` are config-only too — but [`swagger.transform`](#post-processing-the-document) is the only one that never could have one, since a function cannot come from argv.

### CLI flags override config

CLI flags always win. Drop a config in your repo for the common case, then override per-invocation:

```bash
trapi generate --version v3.1 --output docs/openapi.v3.1.json
```

Use `--config <path>` to point at a non-discovered file, or `--no-config` to skip discovery entirely.

### Multi-target output

Export an array to emit several specs from one metadata pass — entries with identical metadata options share extraction:

```typescript
// trapi.config.ts
import { defineConfig } from '@trapi/cli';

const shared = {
    metadata: {
        entryPoint: 'src/controllers/**/*.ts',
        preset: '@trapi/preset-decorators-express',
    },
};

export default defineConfig([
    { ...shared, swagger: { version: 'v3.2' }, output: { path: 'dist/openapi.v3.2.json' } },
    { ...shared, swagger: { version: 'v2'   }, output: { path: 'dist/openapi.v2.yaml'  } },
]);
```

### Post-processing the document

`swagger.transform` runs after `generateSwagger` and before the output file is written, so it sees the finished document — including the paths and `operationId`s the emitter assigned. That is what `swagger.data.extra` cannot give you: `extra` is merged from an input built *before* generation, so it can't key on values the emitter produces.

Mutate the document in place and return nothing, or return a replacement:

```typescript
// trapi.config.ts
import { defineConfig } from '@trapi/cli';

export default defineConfig({
    metadata: { entryPoint: 'src/**/*.ts', preset: '@trapi/preset-decorators-express' },
    swagger: {
        version: 'v3.1',
        transform(spec) {
            const VERBS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

            for (const [url, item] of Object.entries(spec.paths)) {
                for (const [verb, operation] of Object.entries(item)) {
                    // A Path Item may also hold $ref/parameters/summary/description.
                    if (!VERBS.includes(verb)) continue;

                    // Edits keyed on what the emitter actually produced.
                    operation['x-internal'] = url.startsWith('/admin');

                    // Project-specific assertions that fail the build.
                    if (!operation.summary) {
                        throw new Error(`${verb.toUpperCase()} ${url} has no summary.`);
                    }
                }
            }
        },
    },
    output: { path: 'docs/openapi.json' },
});
```

The transform may be `async`; the CLI awaits it before writing.

Throwing aborts the run: the file for that entry is **not** written, so a rejected document never lands on disk — and the previous run's file is left exactly as it was (it is not deleted). `trapi generate` then exits non-zero. Throwing a `CLIUserError` (exported from `@trapi/cli`) gives exit code `1` plus a bare message; any other error gives exit code `2` plus a stack trace.

In a multi-target config the transform is per entry, and targets are emitted in config order — sharing metadata extraction between entries never reorders emission — so if entry 3 throws, the files for entries 1 and 2 are already written.

A `trapi.config.json` (or the `trapi` field in `package.json`) cannot carry a function — the CLI raises a `CLIUserError` if it finds a non-function there.

## Commands

### `trapi generate`

Generate an OpenAPI / Swagger specification from decorated TypeScript sources.

```bash
trapi generate [OPTIONS]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--entry-point` | Glob pattern matching the source files to scan. Required if not set in config. | _config_ |
| `--preset` | Preset to load (npm package name or local path). | _config_ |
| `--tsconfig` | Path to a `tsconfig.json` used to compile the sources. | _config_ |
| `--ignore` | Comma-separated globs to skip during the source-file scan. | _config_ |
| `--allow` | Comma-separated globs to include during the source-file scan. | _config_ |
| `--cache` | Cache the generated metadata between runs. | `false` |
| `--strict` | `true` warns on unmatched decorators, `throw` errors out. | _off_ |
| `--output` | Output file path. The extension picks the format unless `--format` is set. | `swagger.json` |
| `--format` | Output document format (`json` \| `yaml`). | inferred from `--output` |
| `--version` | OpenAPI specification version (`v2` \| `v3` \| `v3.1` \| `v3.2`). The leading `v` is optional. | `v3` |
| `--api-name` | API name written into the spec `info` object. | _package.json_ |
| `--api-version` | API version written into the spec `info` object. | _package.json_ |
| `--api-description` | API description written into the spec `info` object. | _package.json_ |
| `--servers` | Comma-separated server URLs written into `spec.servers`. | _config_ |
| `--security-definitions` | JSON string of security scheme definitions. | _config_ |
| `--cwd` | Working directory. Relative paths in config + flags are resolved against it. | `process.cwd()` |
| `--config` | Path to a config file. Disables discovery. | _auto-discover_ |
| `--no-config` | Skip config discovery and ignore `--config`. | `false` |
| `--log-level` | `silent` \| `info` \| `debug`. | `info` |

Run `trapi generate --help` to see this list rendered against the installed version.

#### Examples

Generate a YAML 3.0 spec from controllers under `src/api/`:

```bash
trapi generate \
  --entry-point 'src/api/**/*.ts' \
  --preset @trapi/preset-decorators-express \
  --output docs/openapi.yaml \
  --version 3
```

Pass security schemes inline (escape hatch when you don't want a config file):

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --preset @trapi/preset-decorators-express \
  --servers https://api.example.com \
  --security-definitions '{"bearer":{"type":"apiKey","name":"Authorization","in":"header"}}'
```

Treat unmatched decorators as errors (catches typos like `@Hiden` in CI):

```bash
trapi generate --entry-point 'src/**/*.ts' --strict throw
```

### `trapi watch`

Re-run `generate` whenever source files or the config change. Accepts the same flags as `trapi generate`, plus `--clear` to reset the console between runs.

```bash
trapi watch --entry-point 'src/**/*.ts' --preset @trapi/preset-decorators-express
```

The watcher uses [chokidar](https://github.com/paulmillr/chokidar) — atomic writes from editors are handled, and the CLI's own output files are excluded from triggering re-runs.

A [`swagger.transform`](#post-processing-the-document) that throws is logged and watching continues rather than exiting, so a failing assertion is fixed on the next change. Note that a transform which itself writes files under a watched root will retrigger the watcher.

### `trapi info`

Print version + environment diagnostics for bug reports.

```bash
$ trapi info
trapi 0.2.0
node v22.21.1
platform darwin arm64
cwd /path/to/project
config /path/to/project/trapi.config.ts
entries 1
@trapi/core 2.0.0
@trapi/metadata 2.0.0
@trapi/swagger 2.0.0
typescript 5.5.4
```

### `trapi cache clean`

Delete cached metadata files (`.trapi-metadata-*.json`).

```bash
trapi cache clean                            # wipe the OS tmpdir
trapi cache clean --directory .trapi-cache   # wipe a custom dir
trapi cache clean --max-age 604800000        # only delete files older than 7 days
```

The metadata cache evicts files older than `maxAgeMs` automatically after each successful run; this command is for manual cleanup when you want to force a cold rebuild.

## Programmatic Usage

The same factory the bin uses is exported from the package:

```typescript
import { runMain } from 'citty';
import { createCLIEntryPointCommand } from '@trapi/cli';

const command = await createCLIEntryPointCommand();
await runMain(command);
```

For one-shot programmatic generation, compose `@trapi/metadata` + `@trapi/swagger` directly:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: 'src/**/*.ts',
    preset: '@trapi/preset-decorators-express',
});

const spec = await generateSwagger({ version: 'v3.1', metadata });

await saveSwagger(spec, { name: 'openapi', cwd: 'docs' });
```

## Structure

```
src/
├── bin.ts            # #!/usr/bin/env node — calls runMain()
├── module.ts         # createCLIEntryPointCommand() — root command factory
├── config/           # Config file discovery, defineConfig, merge precedence
├── commands/
│   ├── generate.ts   # `trapi generate`
│   ├── watch.ts      # `trapi watch`
│   ├── info.ts       # `trapi info`
│   ├── cache.ts      # `trapi cache clean`
│   └── utils.ts      # Shared arg parsing + path splitting
├── logger.ts         # Tiny stderr logger + CLIUserError
├── exit.ts           # Exit-code wrapper
├── utils.ts          # readPackageJson() for citty meta
└── index.ts          # Public exports (defineConfig, createLogger, …)
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
