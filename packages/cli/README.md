<p align="center"><img src="./assets/logo.svg" width="120" height="120" alt="TRAPI logo: the letter T inside a pair of generic type brackets"></p>
<h1 align="center">@trapi/cli</h1>
<p align="center"><strong>CLI for generating REST-API metadata and OpenAPI / Swagger specifications.</strong></p>
<p align="center">Stop hand-writing the build script that calls <code>generateMetadata</code>, <code>generateSwagger</code> and <code>saveSwagger</code>.<br>One <code>trapi generate</code> reads a config file, extracts once and writes every document you list.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/cli"><img src="https://img.shields.io/npm/v/%40trapi%2Fcli" alt="npm version"></a>
  <a href="https://github.com/tada5hi/trapi/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-trapicli">Why</a> · <a href="#installation">Installation</a> · <a href="#configuration-file">Configuration</a> · <a href="#commands">Commands</a> · <a href="#exit-codes">Exit codes</a> · <a href="#programmatic-usage">Programmatic usage</a> · <a href="#notes">Notes</a></p>

---

## Why @trapi/cli?

[`@trapi/metadata`](https://www.npmjs.com/package/@trapi/metadata) extracts metadata from decorated TypeScript and [`@trapi/swagger`](https://www.npmjs.com/package/@trapi/swagger) turns it into an OpenAPI document. Both are libraries, so every project ends up with the same glue script: parse a few options, call both, write the file, set an exit code, and maybe re-run on change. `@trapi/cli` is that script, written once.

| Concern | A hand-written script | `@trapi/cli` |
| --- | --- | --- |
| **Options** | Hard-coded in the script, or ad-hoc `process.argv` parsing | A typed `trapi.config.ts` (`defineConfig`), overridable per run with validated flags |
| **Several documents** | Call `generateMetadata` per document, or cache it yourself | An array config: entries with equal metadata options share one extraction |
| **Output file** | Split the path into `cwd`/`name`/`format` for `saveSwagger` | `--output docs/openapi.yaml` picks YAML from the extension and creates the directory |
| **Post-processing** | Edit the document between your two calls | `swagger.transform` sees the finished document; throwing keeps the old file |
| **CI failure** | Decide on exit codes and error printing yourself | Exit `1` for usage errors (message only), `2` for everything else (with stack) |
| **Iteration** | Re-run the script by hand, or wire up a file watcher | `trapi watch` re-runs on source or config changes, ignoring its own output |
| **Bug reports** | Collect Node, platform and package versions by hand | `trapi info` prints them |

The same document, both ways:

```typescript
// build-openapi.ts: the script you no longer write
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: 'src/**/*.ts',
    preset: '@trapi/preset-decorators-express',
});

const spec = await generateSwagger({ version: 'v3.1', metadata });

await saveSwagger(spec, { cwd: 'docs', name: 'openapi' });
```

```bash
npx trapi generate --preset @trapi/preset-decorators-express --entry-point 'src/**/*.ts' \
  --version 3.1 --output docs/openapi.json
```

<p align="center"><img src="./assets/cli-pipeline.svg" width="960" alt="trapi generate loads trapi.config.ts (or the trapi field in package.json, or nothing), resolves every entry against the CLI flags, runs generateMetadata once per distinct metadata signature, then for each entry runs generateSwagger, the optional swagger.transform and saveSwagger. For a two-entry config the debug log shows one extraction and two written files, openapi.v3.2.json and openapi.v2.yaml."></p>

`trapi generate` loads the config, resolves each entry against the CLI flags, runs `generateMetadata` once per distinct set of metadata options, then runs `generateSwagger`, the optional `swagger.transform` and `saveSwagger` for each entry, in config order. The CLI is built on [citty](https://github.com/unjs/citty), so `--help` works on every command and flag values are checked before anything runs.

**Table of Contents**

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration File](#configuration-file)
  - [How the config is found](#how-the-config-is-found)
  - [CLI flags override config](#cli-flags-override-config)
  - [Multi-target output](#multi-target-output)
  - [Post-processing the document](#post-processing-the-document)
- [Commands](#commands)
  - [generate](#trapi-generate)
  - [watch](#trapi-watch)
  - [info](#trapi-info)
  - [cache clean](#trapi-cache-clean)
- [Exit codes](#exit-codes)
- [Programmatic Usage](#programmatic-usage)
- [Notes](#notes)
- [Structure](#structure)
- [License](#license)

## Installation

```bash
npm install --save-dev @trapi/cli
```

The package ships a `trapi` bin and is ESM only. It requires Node.js 24 or newer. Install it in the project that owns the controllers. `@trapi/metadata` and `@trapi/swagger` come in as dependencies; add the preset for your framework yourself, for example [`@trapi/preset-decorators-express`](https://www.npmjs.com/package/@trapi/preset-decorators-express) or [`@trapi/preset-typescript-rest`](https://www.npmjs.com/package/@trapi/preset-typescript-rest):

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

The example above:

1. Loads the [`@trapi/preset-decorators-express`](https://www.npmjs.com/package/@trapi/preset-decorators-express) preset.
2. Scans every `.ts` file under `src/` for decorated controllers.
3. Generates an OpenAPI **3.1** document.
4. Writes it to `docs/openapi.json`, creating `docs/` if needed. The `.json` extension picks the format.

Pass `--format yaml` or use a `.yaml`/`.yml` extension to emit YAML instead. Both `--version 3.1` and `--version v3.1` are accepted.

## Configuration File

Anything beyond a one-liner is easier in a config file:

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
                bearer: { type: 'http', scheme: 'bearer' },
            },
        },
    },
    output: {
        path: 'docs/openapi.json',
    },
});
```

`defineConfig` is an identity helper: pass any `TrapiConfig` (one entry or an array of entries) and you get autocompletion and type checking. An entry has four optional keys:

| Key | Type | Description |
| --- | --- | --- |
| `metadata` | `Partial<MetadataGenerateOptions>` | Forwarded to `generateMetadata`: `entryPoint`, `preset`, `registry`, `tsconfig`, `ignore`, `allow`, `cache`, `strict`, `onUnmatchedDecorator`. `entryPoint` is required here or as `--entry-point`. |
| `swagger.version` | `'v2' \| 'v3' \| 'v3.1' \| 'v3.2'` | OpenAPI version. Default `'v3'`. |
| `swagger.data` | `SwaggerGenerateData` | Forwarded to `generateSwagger`: `name`, `version`, `description`, `license`, `servers`, `securityDefinitions`, `consumes`, `produces`, `responses`, `pathParameters`, `collectionFormat`, `operationIdStrategy`, `extra`. |
| `swagger.transform` | `(spec) => spec \| void` | Post-processes the finished document. See [Post-processing the document](#post-processing-the-document). |
| `output.path` | `string` | Output file. Default `'swagger.json'`. A relative path resolves against the config file's directory. |
| `output.format` | `'json' \| 'yaml'` | Overrides the format the extension implies. |
| `cwd` | `string` | Directory a relative `output.path` resolves against. Defaults to the config file's directory. |

Not every field has a CLI flag: `swagger.data.extra`, `consumes`/`produces`, `responses`, `pathParameters`, `collectionFormat`, `operationIdStrategy`, `license` and the metadata `registry` are config-only. [`swagger.transform`](#post-processing-the-document) never could have one, since a function cannot come from argv. The [`swagger.data` reference](https://trapi.tada5hi.net/guide/swagger-document-data) explains each data field.

### How the config is found

<p align="center"><img src="./assets/cli-config-discovery.svg" width="960" alt="The first step that applies wins: --noConfig skips configuration, --config loads that file and fails with exit code 1 when it is missing, otherwise the first trapi.config file with extension ts, mts, cts, mjs, cjs, js or json in the working directory, otherwise the trapi field of package.json in that directory, otherwise the flags alone form one entry. The file default export is unwrapped and may be one entry or an array of entries."></p>

The first step that applies wins:

1. `--noConfig` skips configuration entirely (see the [note on `--no-config`](#notes)).
2. `--config <path>` loads that file. A missing file is a usage error (exit code `1`), not a silent fallback.
3. Otherwise the first `trapi.config.{ts,mts,cts,mjs,cjs,js,json}` in the working directory (`--cwd`, or the current directory). Discovery does not walk up to parent directories.
4. Otherwise the `trapi` field of `package.json` in that directory.
5. Otherwise the flags alone form a single entry.

A module's `default` export is unwrapped. The value must be an object or an array of objects; anything else fails with a `CLIUserError`. A config file that throws while loading fails with `Failed to load config "…"`.

### CLI flags override config

<p align="center"><img src="./assets/cli-precedence.svg" width="960" alt="For each value the CLI flag wins over the config file, which wins over the built-in default. --version 3.1 beats swagger.version v3.2 and the default v3, giving v3.1. --output out/api.yml beats output.path and the default swagger.json; the file is written as out/api.yaml. Without --api-name, swagger.data.name My API beats the emitter default Documentation. With no entryPoint anywhere the run fails with exit code 1."></p>

A flag always wins over the config, which wins over the default. Drop a config in your repo for the common case, then override per invocation:

```bash
trapi generate --version v3.1 --output docs/openapi.v3.1.json
```

Flags are applied to **every** entry of a multi-target config. `--version` therefore turns every document into that version, and `--output` sends every document to the same path, so the last entry's document is the one left on disk. Use `--config <path>` to point at a file that is not discovered, or `--noConfig` to skip the config.

`swagger.data` merges key by key: `--api-name` replaces `data.name` and keeps the rest of `data`. `--servers` and `--security-definitions` replace the whole `servers` or `securityDefinitions` value. `--cache` replaces the whole `metadata.cache` value, including an object form with its own `directoryPath`.

### Multi-target output

Export an array to emit several documents. Entries with identical metadata options share one extraction:

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
    { ...shared, swagger: { version: 'v2' }, output: { path: 'dist/openapi.v2.yaml' } },
]);
```

<p align="center"><img src="./assets/cli-multi-target.svg" width="960" alt="A trapi.config.ts exports an array of two entries that share the same metadata options. trapi generate runs generateMetadata once, because both entries have the same metadata signature, then generateSwagger twice: version v3.2 written to dist/openapi.v3.2.json and version v2 written to dist/openapi.v2.yaml, in config order."></p>

Two entries share an extraction when their `entryPoint`, `preset`, `tsconfig`, `ignore`, `allow`, `cache` and `strict` are equal (compared as JSON). An entry with an inline `preset` object, an inline `tsconfig` object or a `registry` always gets its own extraction, because inline objects cannot be compared safely. Sharing never reorders emission: documents are generated and written in config order.

### Post-processing the document

`swagger.transform` runs after `generateSwagger` and before the output file is written, so it sees the finished document, including the paths and `operationId`s the emitter assigned. That is what `swagger.data.extra` cannot give you: `extra` is merged from an input built *before* generation, so it cannot key on values the emitter produces.

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

            for (const [url, item] of Object.entries<Record<string, any>>(spec.paths)) {
                for (const [verb, operation] of Object.entries<Record<string, any>>(item)) {
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

<p align="center"><img src="./assets/cli-transform.svg" width="960" alt="generateSwagger builds the document and swagger.transform receives it before saveSwagger writes it. Returning nothing or null writes the document with its in-place edits; returning an object writes that object; returning an array or a primitive fails with a CLIUserError and exit code 1; throwing writes nothing and leaves the previous file in place, with exit code 1 for a CLIUserError and 2 for any other error. The result is not revalidated."></p>

- The transform may be `async`; the CLI awaits it before writing.
- Returning `undefined` or `null` keeps your in-place edits. Returning an object writes that object instead. Returning an array or a primitive fails with a `CLIUserError` (exit code `1`) and writes nothing.
- Throwing aborts the run: the file for that entry is **not** written, so a rejected document never lands on disk, and the previous run's file is left exactly as it was (it is not deleted). Throwing a `CLIUserError` (exported from `@trapi/cli`) gives exit code `1` and a bare message; any other error gives exit code `2` and a stack trace.
- In a multi-target config the transform is per entry and targets are emitted in config order, so if entry 3 throws, the files for entries 1 and 2 are already written.
- The returned document is written as is. It is **not** revalidated against the OpenAPI schema.
- A `trapi.config.json` (or the `trapi` field in `package.json`) cannot carry a function: the CLI raises a `CLIUserError` if it finds a non-function there.

## Commands

```text
trapi generate [OPTIONS]                  generate one document per config entry
trapi watch [OPTIONS] [--clear]           re-run generate on source or config changes
trapi info [--cwd] [--log-level]          print version and environment diagnostics
trapi cache clean [--directory] [--max-age] [--log-level]
                                          delete cached metadata files
```

`trapi --help` and `trapi <command> --help` render these lists against the installed version.

### `trapi generate`

Generate an OpenAPI / Swagger specification from decorated TypeScript sources.

```bash
trapi generate [OPTIONS]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--entry-point` | Glob matching the source files to scan. Required if not set in config. Relative globs resolve against the process working directory. | _config_ |
| `--preset` | Preset to load (npm package name or local path). | _config_ |
| `--tsconfig` | Path to a `tsconfig.json` used to compile the sources. | _config_ |
| `--ignore` | Comma-separated globs to skip during the source-file scan. | _config_ |
| `--allow` | Comma-separated globs to include during the source-file scan. | _config_ |
| `--cache` | Cache the generated metadata between runs, in the OS temp directory. | off |
| `--strict` | `true` (or a bare `--strict`) warns on unmatched decorators, `throw` fails the run, `false` turns it off. | off |
| `--output` | Output file path. The extension picks the format unless `--format` is set. | `swagger.json` |
| `--format` | Output document format (`json` \| `yaml`). | from `--output`, else `json` |
| `--version` | OpenAPI specification version (`v2` \| `v3` \| `v3.1` \| `v3.2`). The leading `v` is optional. | `v3` |
| `--api-name` | API name written into `info.title`. | `Documentation` |
| `--api-version` | API version written into `info.version`. | `1.0.0` |
| `--api-description` | API description written into `info.description`. | omitted |
| `--servers` | Comma-separated server URLs written into `servers`. | _config_ |
| `--security-definitions` | JSON object of security scheme definitions (`SwaggerGenerateData.securityDefinitions`). | _config_ |
| `--cwd` | Working directory for config discovery and for a relative `--output`. | `process.cwd()` |
| `--config` | Path to a config file. Disables discovery. | _auto-discover_ |
| `--noConfig` | Skip config discovery. See the [note on `--no-config`](#notes). | `false` |
| `--log-level` | `silent` \| `info` \| `debug`. | `info` |

**Output file name.** The written file always carries the extension of its format: `--output docs/openapi.yml` writes `docs/openapi.yaml`, and `--format yaml --output docs/openapi.json` writes `docs/openapi.yaml`. Format precedence is `--format`, then `output.format`, then the extension (`.json`, `.yaml`, `.yml`), then `json`.

**Logging.** All log output goes to stderr. `info` prints one `wrote <path> (<version>)` line per document and a final `done in <n>ms`; `debug` adds the config path, the number of targets and the controller and reference-type counts of each extraction; `silent` prints errors only.

#### Examples

Generate a YAML 3.0 spec from controllers under `src/api/`:

```bash
trapi generate \
  --entry-point 'src/api/**/*.ts' \
  --preset @trapi/preset-decorators-express \
  --output docs/openapi.yaml \
  --version 3
```

Set the `info` object:

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --preset @trapi/preset-decorators-express \
  --output spec.json \
  --api-name "Acme API" \
  --api-version 1.4.2 \
  --api-description "Internal Acme service surface."
```

Pass servers and security schemes inline (escape hatch when you don't want a config file):

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --preset @trapi/preset-decorators-express \
  --servers https://api.example.com,https://staging.example.com \
  --security-definitions '{"bearer":{"type":"http","scheme":"bearer"}}'
```

Treat unmatched decorators as errors (catches typos like `@Hiden` in CI):

```bash
trapi generate --entry-point 'src/**/*.ts' --preset @trapi/preset-decorators-express --strict throw
```

`--strict throw` fails with a `GeneratorError` listing every unmatched decorator with its file and line (exit code `2`); `--strict true` prints the same list as a warning and still writes the document. JSDoc tags are not part of strict reporting.

### `trapi watch`

Re-run `generate` whenever source files or the config change. Accepts the same flags as `trapi generate`, plus `--clear` to reset the console between runs.

```bash
trapi watch --entry-point 'src/**/*.ts' --preset @trapi/preset-decorators-express
```

<p align="center"><img src="./assets/cli-watch.svg" width="960" alt="trapi watch resolves the targets once and watches the static prefix of each entryPoint glob, for example src/controllers for src/controllers/**/*.ts, plus the directory of the config file. node_modules, .git, dist, build, coverage and the files written by the last run are ignored. A change is debounced for 200 ms, then the full generate run repeats, re-reading the config. A change during a run queues one more run. Errors are logged and watching continues."></p>

- **What is watched.** The static prefix of every `entryPoint` glob (`src/controllers/**/*.ts` watches `src/controllers`) plus the directory of the loaded config file. When none of them exists, the working directory is watched.
- **What is ignored.** Paths inside `node_modules`, `.git`, `dist`, `build` or `coverage`, and the files the last run wrote, so the CLI does not loop on its own output.
- **What re-runs.** The watcher uses [chokidar](https://github.com/paulmillr/chokidar) and waits for writes to settle, so atomic writes from editors are handled. 200 ms after the last event the full `generate` run repeats: the config is re-read and metadata is extracted again. A change during a run queues exactly one more run.
- **Failures.** An error in a run, including a [`swagger.transform`](#post-processing-the-document) that throws, is logged and watching continues, so a failing assertion is fixed on the next change. Errors before the first run (an unknown flag value, a missing `entryPoint`) still exit.
- **Limits.** The watch roots are computed once at startup; restart after changing `entryPoint`. Ignoring matches any path segment, so sources or a config inside a `dist/` or `build/` directory never trigger a run. A transform that writes files under a watched root retriggers the watcher.
- `Ctrl+C` (SIGINT or SIGTERM) closes the watcher and exits with code `0`.

### `trapi info`

Print version and environment diagnostics for bug reports. Accepts `--cwd` (the directory to discover the config in and to look up dependencies from) and `--log-level`. The output goes to stderr:

```text
$ trapi info
ℹ trapi v2.2.0

Environment
  node      v26.13.0
  platform  darwin arm64
  cwd       /path/to/project

Config
  file     /path/to/project/trapi.config.ts
  entries  2

Dependencies
  @trapi/core      2.2.0
  @trapi/metadata  2.2.0
  @trapi/swagger   2.2.0
  typescript       6.0.3
```

`file` shows `<none>` when no config was found, and a dependency that cannot be found in any `node_modules` up the tree shows `<not installed>`. A config that fails to load makes `info` fail too.

### `trapi cache clean`

Delete cached metadata files (`.trapi-metadata-*.json`).

```bash
trapi cache clean                            # wipe the OS tmpdir
trapi cache clean --directory .trapi-cache   # wipe a custom dir
trapi cache clean --max-age 604800000        # only delete files older than 7 days
```

<p align="center"><img src="./assets/cli-diagnostics.svg" width="960" alt="trapi info prints the CLI version, the Node.js version, platform and working directory, the config file and its number of entries, and the installed versions of @trapi/core, @trapi/metadata, @trapi/swagger and typescript. trapi cache clean --max-age 604800000 deletes .trapi-metadata-*.json files older than seven days, keeps newer ones and never touches other files."></p>

| Flag | Description | Default |
|------|-------------|---------|
| `--directory` | Directory holding the cache files. Relative paths resolve against the process working directory. | the OS temp directory |
| `--max-age` | Only delete files whose modification time is older than this many milliseconds. | delete all |
| `--log-level` | `silent` \| `info` \| `debug`. | `info` |

Only files named `.trapi-metadata-*.json` are touched. The command prints `removed <n> cache file(s) from <directory>`, plus `(<n> retained)` when `--max-age` kept some. A directory that does not exist removes nothing and still succeeds; a negative or non-numeric `--max-age` is a usage error.

The metadata cache evicts files older than its `maxAgeMs` automatically after each successful run; this command is for manual cleanup when you want to force a cold rebuild. It does not read your config, so pass `--directory` when `metadata.cache` stores its files somewhere other than the OS temp directory.

## Exit codes

<p align="center"><img src="./assets/cli-exit-codes.svg" width="960" alt="Exit code 0 when every target was written, when info or cache clean finished, or when watch was stopped. Exit code 1 for a CLIUserError, printed as a bare message: an unknown version, no entryPoint, a missing --config file, a bad --strict or --max-age value, a transform returning a non-object, or an unknown subcommand. Exit code 2 for any other error, printed with its stack: GeneratorError from strict throw, an Error thrown in a transform."></p>

| Code | `ExitCode` | When | Printed |
| --- | --- | --- | --- |
| `0` | `Success` | Every target written; `info` or `cache clean` finished; `watch` stopped | Normal log output |
| `1` | `UserError` | A `CLIUserError`: unknown `--version`, `--format`, `--strict` or `--max-age` value, invalid `--security-definitions` JSON, no `entryPoint`, missing `--config` file, a config that fails to load or is not an object, a non-function `swagger.transform` or one that returns a non-object, a `CLIUserError` thrown in a transform | The message only |
| `1` | | Reported by citty before the command runs: an unknown subcommand, an unknown `--log-level` | citty's own output |
| `2` | `InternalError` | Any other error: a `GeneratorError` from `--strict throw`, a `ConfigError` when no preset or registry is set and no controllers were found, an `Error` thrown in a transform, any other error from `@trapi/metadata` or `@trapi/swagger` | The stack trace |

`generate` stops at the first failing target; documents of earlier entries are already on disk. Throw a `CLIUserError` from your own transform for a clean, stack-free CI failure.

## Programmatic Usage

The same factory the bin uses is exported, in case you want to embed the CLI or build sibling commands on top:

```typescript
import { runMain } from 'citty';
import { createCLIEntryPointCommand } from '@trapi/cli';

const command = await createCLIEntryPointCommand();
await runMain(command);
```

To run the CLI's pipeline from a build script without `process.exit`, call `runGenerate`. It takes the same arguments as the command line, keyed by flag name, and throws instead of exiting:

```typescript
import { createLogger, runGenerate } from '@trapi/cli';

const results = await runGenerate(
    { config: 'trapi.config.ts', version: 'v3.1' },
    createLogger('silent'),
);

for (const { output } of results) {
    console.log(output.path);
}
```

To share only the config layer, `resolveTargets` returns the resolved entries (config discovery plus flag overrides) and `runTargets` emits them:

```typescript
import { createLogger, resolveTargets, runTargets } from '@trapi/cli';

const { configPath, targets } = await resolveTargets({ 'entry-point': 'src/**/*.ts' });

console.log(configPath, targets.map((target) => target.output.path));

await runTargets(targets, createLogger('info'));
```

For one-shot programmatic generation without the CLI, compose `@trapi/metadata` and `@trapi/swagger` directly as shown in [Why @trapi/cli?](#why-trapicli); the [Generating a Spec](https://trapi.tada5hi.net/guide/swagger-generation) guide covers it in depth.

| Export | Kind | Purpose |
| --- | --- | --- |
| `createCLIEntryPointCommand` | function | Root citty command with `generate`, `watch`, `info`, `cache` |
| `defineCLIGenerateCommand`, `defineCLIWatchCommand`, `defineCLIInfoCommand`, `defineCLICacheCommand` | function | The individual citty commands |
| `GENERATE_ARGS` | constant | citty argument definitions shared by `generate` and `watch` |
| `runGenerate(args, logger?)` | function | Resolve targets and emit them; returns `GenerateResult[]` |
| `resolveTargets(args)` | function | Config discovery plus flag overrides; returns `{ cwd, configPath, targets }` |
| `runTargets(targets, logger)` | function | Extract (memoised per metadata signature) and emit, in order |
| `emitOne(target, metadata, logger)` | function | `generateSwagger`, `transform` and `saveSwagger` for one target |
| `cleanCache({ directory, maxAgeMs? })` | function | What `trapi cache clean` runs; returns `{ removed, skipped }` |
| `defineConfig` | function | Identity helper for typed config files |
| `loadConfig({ cwd, configPath?, disabled? })` | function | Config discovery; returns `{ path?, entries }` |
| `resolveEntry(entry, flags, fallbackCwd)` | function | Merge one entry with `GenerateFlags` into a `ResolvedTarget` |
| `defaultConfigCwd(loaded, fallbackCwd)` | function | The config file's directory, or the fallback |
| `createLogger(level?)`, `normalizeLogLevel`, `LogLevel`, `LOG_LEVEL_VALUES` | function, constant | The stderr logger the commands use |
| `CLIUserError` | class | Usage error: exit code `1`, message only |
| `runWithExitCode(logger, fn)`, `ExitCode` | function, constant | Runs `fn` and exits with `0`, `1` or `2` |
| `TrapiConfig`, `TrapiConfigEntry`, `TrapiOutputConfig`, `SwaggerTransform`, `GenerateFlags`, `ResolvedTarget`, `LoadedConfig`, `LoadConfigOptions`, `GenerateArgs`, `GenerateResult`, `ResolvedTargets`, `CleanCacheOptions`, `CleanCacheResult`, `Logger` | type | Config, resolution and result shapes |

The [CLI guide](https://trapi.tada5hi.net/guide/cli) on the documentation site covers the same commands with more examples.

## Notes

- **`--no-config` does not skip the config.** citty parses `--no-config` as the negation of `--config`, so the documented `no-config` flag never becomes `true` and discovery still runs. Use the camel-case spelling `--noConfig`, which citty maps to the same flag, until this is fixed.
- **`--cwd` and an entry's `cwd` do not move the source scan.** They set where the config is discovered and where a relative `output.path` lands. A relative `entryPoint` glob and a `tsconfig` path resolve against the process working directory. Run `trapi` from the project root, use absolute globs, or pass `entryPoint` as `{ pattern, cwd }` in the config.
- **One glob per `--entry-point` flag.** The flag takes a single glob string. `metadata.entryPoint` in the config also accepts an array and `{ pattern, cwd }` objects.
- **`info` defaults are not read from `package.json`.** Without `--api-name`/`--api-version` (or `swagger.data`), the document carries `title: Documentation` and `version: 1.0.0`, and no description.
- **The output extension follows the format.** See [Output file name](#trapi-generate): a `.yml` path is written as `.yaml`.
- **No `--check` mode.** Comparing the generated document against a committed file in CI is not built in; generate into a temporary path and diff it.
- **`swagger.transform` needs a JS/TS config file.** A JSON config (or the `trapi` field in `package.json`) cannot carry a function.

## Structure

```
src/
├── bin.ts            # #!/usr/bin/env node: calls runMain()
├── module.ts         # createCLIEntryPointCommand(): root command factory
├── config/           # Config file discovery, defineConfig, merge precedence
├── commands/
│   ├── generate.ts   # `trapi generate`, runGenerate, runTargets, emitOne
│   ├── watch.ts      # `trapi watch`
│   ├── info.ts       # `trapi info`
│   ├── cache.ts      # `trapi cache clean`, cleanCache
│   └── utils.ts      # Shared arg parsing + output path splitting
├── logger.ts         # Tiny stderr logger + CLIUserError
├── exit.ts           # Exit-code wrapper
├── utils.ts          # readPackageJson() for citty meta
└── index.ts          # Public exports (defineConfig, createLogger, …)
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
