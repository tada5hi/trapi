# CLI

[`@trapi/cli`](https://www.npmjs.com/package/@trapi/cli) ships a `trapi` bin that wraps `generateMetadata` + `generateSwagger` + `saveSwagger` behind a single command. Use it when you want a generated spec on disk without writing your own `tsx scripts/generate-openapi.ts`.

The CLI is built on [citty](https://github.com/unjs/citty) — `--help` is wired up automatically and arguments are validated up-front.

## Installation

```bash
npm install --save-dev @trapi/cli
```

`@trapi/metadata` and `@trapi/swagger` are pulled in transitively. You'll typically also install the preset you want to use (e.g. `@trapi/decorators`).

```bash
npm install --save-dev @trapi/decorators
```

## Quick Start

```bash
npx trapi generate \
  --preset @trapi/decorators \
  --entry-point 'src/**/*.ts' \
  --output docs/openapi.json \
  --version 3.1
```

This loads the [`@trapi/decorators`](/guide/metadata-decorators) preset, scans every `.ts` file under `src/` for decorated controllers, and writes an OpenAPI 3.1 document to `docs/openapi.json`. Both `--version 3.1` and `--version v3.1` are accepted; the `.json` suffix on `--output` picks the format automatically.

## Commands

### `trapi generate`

Generate an OpenAPI / Swagger specification from decorated TypeScript sources.

```bash
trapi generate [OPTIONS] --entry-point=<glob>
```

| Flag | Description | Default |
|------|-------------|---------|
| `--entry-point` _(required)_ | Glob pattern matching the source files to scan. | — |
| `--preset` | Preset to load (npm package name or local path). | _none_ |
| `--tsconfig` | Path to a `tsconfig.json` used to compile the sources. | _none_ |
| `--output` | Output file path. The extension picks the format unless `--format` is set. | `swagger.json` |
| `--format` | Output document format (`json` \| `yaml`). | inferred from `--output` |
| `--version` | OpenAPI specification version (`v2` \| `v3` \| `v3.1` \| `v3.2`). The leading `v` is optional. | `v3` |
| `--strict` | Warn on decorators that no preset handler matched (catches typos like `@Hiden`). | `false` |
| `--cache` | Cache the generated metadata between runs. | `false` |
| `--name` | API name written into the spec `info` object. | _package.json_ |
| `--api-version` | API version written into the spec `info` object. | _package.json_ |
| `--description` | API description written into the spec `info` object. | _package.json_ |

Run `trapi generate --help` to render the same list against the installed version.

## Examples

### YAML output for OpenAPI 3.0

```bash
trapi generate \
  --entry-point 'src/api/**/*.ts' \
  --preset @trapi/decorators \
  --output docs/openapi.yaml \
  --version 3.0
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

### Custom `tsconfig.json` and strict-mode reporting

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --tsconfig tsconfig.api.json \
  --preset @trapi/decorators \
  --strict
```

`--strict` is a boolean today (warn mode). The full `'throw'` variant is reachable via the programmatic API — see [Metadata Configuration](/guide/metadata-configuration).

## Programmatic Usage

The same factory the bin uses is exported from the package, in case you want to embed it or build sibling commands on top:

```typescript
import { runMain } from 'citty';
import { createCLIEntryPointCommand } from '@trapi/cli';

const command = await createCLIEntryPointCommand();
await runMain(command);
```

For one-shot programmatic generation, prefer using `@trapi/swagger` directly — see [Generating a Spec](/guide/swagger-generation).

## Limitations

- **Single entry-point glob.** `--entry-point` accepts one glob string today; the metadata layer also supports arrays and `EntryPointOptions[]` programmatically. Multiple entry points are a planned follow-up.
- **No `--watch` yet.** Re-run the command on file changes through your existing watcher of choice (e.g. `nodemon`, `chokidar-cli`) for now.
- **No `--check` mode.** Drift detection in CI (compare generated spec against committed file) is on the roadmap.
