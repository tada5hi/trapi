# @trapi/cli ⚡

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fcli.svg)](https://badge.fury.io/js/@trapi%2Fcli)

A thin command-line wrapper around [`@trapi/metadata`](../metadata) and [`@trapi/swagger`](../swagger). It replaces the boilerplate `tsx scripts/generate-openapi.ts` script every consumer ends up writing — point it at your sources and it emits an OpenAPI / Swagger document.

Built on [citty](https://github.com/unjs/citty), so `--help` is wired up automatically and arguments are validated up-front.

**Table of Contents**

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands](#commands)
  - [`trapi generate`](#trapi-generate)
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

Override the API metadata directly from the command line:

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --output spec.json \
  --name "Acme API" \
  --api-version 1.4.2 \
  --description "Internal Acme service surface."
```

Use a custom `tsconfig.json` and surface decorator typos as warnings:

```bash
trapi generate \
  --entry-point 'src/**/*.ts' \
  --tsconfig tsconfig.api.json \
  --preset @trapi/preset-decorators-express \
  --strict
```

## Programmatic Usage

The same building blocks the CLI uses are exported from the package, so you can embed them in custom scripts (or build sibling commands on top):

```typescript
import { runMain } from 'citty';
import { createCLIEntryPointCommand } from '@trapi/cli';

const command = await createCLIEntryPointCommand();
await runMain(command);
```

For one-shot programmatic generation, prefer using `@trapi/swagger` directly:

```typescript
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const spec = await generateSwagger({
    version: 'v3.1',
    metadata: {
        entryPoint: 'src/**/*.ts',
        preset: '@trapi/preset-decorators-express',
    },
});

await saveSwagger(spec, { name: 'openapi', cwd: 'docs' });
```

## Structure

```
src/
├── bin.ts           # #!/usr/bin/env node — calls runMain()
├── module.ts        # createCLIEntryPointCommand() — root command factory
├── commands/
│   ├── generate.ts  # `trapi generate` subcommand
│   └── index.ts
├── utils.ts         # readPackageJson() for citty meta
└── index.ts         # Public exports
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
