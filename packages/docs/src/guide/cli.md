# CLI

[`@trapi/cli`](https://www.npmjs.com/package/@trapi/cli) ships a `trapi` bin that wraps `generateMetadata` + `generateSwagger` + `saveSwagger` behind a single command — config-file driven for non-trivial setups, single-flag invocations for quick scripts.

The CLI is built on [citty](https://github.com/unjs/citty); `--help` is wired up automatically and arguments are validated up-front.

## Installation

```bash
npm install --save-dev @trapi/cli
```

`@trapi/metadata` and `@trapi/swagger` are pulled in transitively. You'll typically also install the preset you want to use:

```bash
npm install --save-dev @trapi/preset-decorators-express
```

## Quick Start

```bash
npx trapi generate \
  --preset @trapi/preset-decorators-express \
  --entry-point 'src/**/*.ts' \
  --output docs/openapi.json \
  --version 3.1
```

This loads the [`@trapi/preset-decorators-express`](/guide/metadata-decorators) preset, scans every `.ts` file under `src/` for decorated controllers, and writes an OpenAPI 3.1 document to `docs/openapi.json`. Both `--version 3.1` and `--version v3.1` are accepted; the `.json` suffix on `--output` picks the format automatically.

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

`defineConfig` is an identity helper — pass any `TrapiConfig` and you get IDE autocompletion + type checking. The shape mirrors the underlying option types (`MetadataGenerateOptions`, `SwaggerGenerateData`, `DocumentFormat`), so anything those accept is reachable from config.

### Override precedence

CLI flags always win over config. Drop a config in your repo for the common case, then override per-invocation:

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
| `--strict` | `true` warns on unmatched decorators, `throw` errors out. Useful for catching typos like `@Hiden`. | _off_ |
| `--output` | Output file path. The extension picks the format unless `--format` is set. | `swagger.json` |
| `--format` | Output document format (`json` \| `yaml`). | inferred from `--output` |
| `--version` | OpenAPI specification version (`v2` \| `v3` \| `v3.1` \| `v3.2`). The leading `v` is optional. | `v3` |
| `--name` | API name written into the spec `info` object. | _package.json_ |
| `--api-version` | API version written into the spec `info` object. | _package.json_ |
| `--description` | API description written into the spec `info` object. | _package.json_ |
| `--servers` | Comma-separated server URLs written into `spec.servers`. | _config_ |
| `--security-definitions` | JSON string of security scheme definitions. | _config_ |
| `--cwd` | Working directory. Relative paths in config + flags are resolved against it. | `process.cwd()` |
| `--config` | Path to a config file. Disables discovery. | _auto-discover_ |
| `--no-config` | Skip config discovery and ignore `--config`. | `false` |
| `--log-level` | `silent` \| `info` \| `debug`. | `info` |

Run `trapi generate --help` to render the same list against the installed version.

### `trapi watch`

Re-run `generate` whenever source files or the config change. Accepts the same flags as `trapi generate`, plus `--clear` to reset the console between runs.

```bash
trapi watch --entry-point 'src/**/*.ts' --preset @trapi/preset-decorators-express
```

The watcher uses [chokidar](https://github.com/paulmillr/chokidar) — atomic writes from editors are handled, and the CLI's own output files are excluded from triggering re-runs.

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

Delete cached metadata files (`.trapi-metadata-*.json`). The metadata cache evicts files older than `maxAgeMs` automatically after each successful run; this command is for manual cleanup when you want to force a cold rebuild.

```bash
trapi cache clean                            # wipe the OS tmpdir
trapi cache clean --directory .trapi-cache   # wipe a custom dir
trapi cache clean --max-age 604800000        # only delete files older than 7 days
```

## Examples

### YAML output for OpenAPI 3.0

```bash
trapi generate \
  --entry-point 'src/api/**/*.ts' \
  --preset @trapi/preset-decorators-express \
  --output docs/openapi.yaml \
  --version 3
```

The `.yaml` suffix selects the YAML emitter; `--format` is unnecessary here.

### Override the spec `info` object

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --output spec.json \
  --name "Acme API" \
  --api-version 1.4.2 \
  --description "Internal Acme service surface."
```

When the `info` flags are omitted, values fall back to the nearest `package.json` — same behaviour as `generateSwagger` called programmatically.

### Inline security schemes + servers

When you don't want to author a config file, the same data lands as inline flags:

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --preset @trapi/preset-decorators-express \
  --servers https://api.example.com,https://staging.example.com \
  --security-definitions '{"bearer":{"type":"apiKey","name":"Authorization","in":"header"}}'
```

For non-trivial security shapes, the config-file form is far more readable — see [Configuration File](#configuration-file) above.

### Strict-mode reporting in CI

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --tsconfig tsconfig.api.json \
  --preset @trapi/preset-decorators-express \
  --strict throw
```

`--strict throw` makes unmatched decorators a hard error — useful as a CI gate. `--strict true` warns instead.

## Programmatic Usage

The same factory the bin uses is exported from the package, in case you want to embed it or build sibling commands on top:

```typescript
import { runMain } from 'citty';
import { createCLIEntryPointCommand } from '@trapi/cli';

const command = await createCLIEntryPointCommand();
await runMain(command);
```

`defineConfig` and the resolved-target helpers (`loadConfig`, `resolveEntry`) are also exported for tools that want to share the CLI's config layer without invoking the bin.

For one-shot programmatic generation, compose `@trapi/metadata` and `@trapi/swagger` directly — see [Generating a Spec](/guide/swagger-generation).

## Limitations

- **Single entry-point glob via CLI flag.** `--entry-point` accepts one glob string. The metadata layer and the config file's `metadata.entryPoint` field both accept arrays + `EntryPointOptions[]` for richer setups.
- **No `--check` mode.** Drift detection in CI (compare generated spec against committed file) is on the roadmap.
