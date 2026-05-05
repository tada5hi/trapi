# @trapi/swagger ⛱

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fswagger.svg)](https://badge.fury.io/js/@trapi%2Fswagger)

Transforms TRAPI metadata into an OpenAPI specification (2.0 / Swagger, 3.0, 3.1, or 3.2) and, optionally, writes it to disk as JSON or YAML.

Inspect the `CHANGELOG.md` in the repository for breaking changes.

## Public API

The stable public surface is documented in the [API Reference](https://trapi.tada5hi.net/guide/swagger-api-reference). Anything not listed there should be treated as internal even if it is re-exported, and may change without a major version bump.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Saving to Disk](#saving-to-disk)
- [Supported Versions](#supported-versions)
- [Structure](#structure)
- [License](#license)

## Installation

```bash
npm install --save @trapi/swagger
```

`@trapi/swagger` only consumes a pre-built `Metadata` value (the framework-neutral type from `@trapi/core`). It does **not** depend on `@trapi/metadata` or the TypeScript compiler. Install `@trapi/metadata` separately if you want to extract metadata from TypeScript decorators:

```bash
npm install --save @trapi/metadata
```

You also need a preset matching the decorator library used by your controllers (or your own custom preset). The examples below use [@decorators/express](https://github.com/serhiisol/node-decorators) via [`@trapi/preset-decorators-express`](../preset-decorators-express); install both:

```bash
npm install --save @trapi/preset-decorators-express @decorators/express
```

## Usage

`generateSwagger()` takes a pre-built `Metadata` value and returns an OpenAPI document. Compose it with `generateMetadata` from `@trapi/metadata` for the typical TypeScript-decorator flow:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
});

const spec = await generateSwagger({
    version: 'v3',
    metadata,
    data: {
        name: 'My API',
        version: '1.0.0',
        description: 'Example service',
        servers: 'https://api.example.com',
    },
});

await saveSwagger(spec, { cwd: './docs', format: 'yaml' });
```

Reuse the same `metadata` for multiple emit targets so the TypeScript walk runs once:

```typescript
const specV3 = await generateSwagger({ version: 'v3', metadata });
const specV2 = await generateSwagger({ version: 'v2', metadata });
```

You can also bring your own `Metadata` from any source — a JSON cache file, a Babel-based extractor, or a hand-rolled fixture — without installing `@trapi/metadata` at all:

```typescript
import type { Metadata } from '@trapi/core';

const metadata: Metadata = JSON.parse(await fs.readFile('cache/metadata.json', 'utf8'));
const spec = await generateSwagger({ version: 'v3', metadata });
```

## Configuration

```typescript
import type { Metadata } from '@trapi/core';

export type SwaggerGenerateOptions = {
    /**
     * OpenAPI spec version to generate.
     * Accepts 'v2', 'v3', 'v3.1', 'v3.2'.
     */
    version: 'v2' | 'v3' | 'v3.1' | 'v3.2';

    /**
     * Pre-built metadata. Produce it via `generateMetadata` from `@trapi/metadata`,
     * or supply your own `Metadata`-shaped value.
     */
    metadata: Metadata;

    /**
     * Document-level content (info block, servers, security, ...).
     * All fields are optional and default to values read from the nearest package.json where possible.
     */
    data?: SwaggerGenerateData;
};

export type SwaggerGenerateData = {
    name?: string;                                    // info.title
    version?: string;                                 // info.version
    description?: string;                             // info.description
    license?: string;                                 // info.license.name
    servers?: string | string[] | ServerOption | ServerOption[];
    securityDefinitions?: SecurityDefinitions;        // OAuth2, API key, basic auth, ...
    consumes?: string[];                              // default request content types
    produces?: string[];                              // default response content types
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
    extra?: Record<string, any>;                      // merged into the final spec
};
```

`extra` is a raw spec fragment merged onto the generated output. Generated properties take precedence where keys overlap.

## Saving to Disk

`saveSwagger()` writes the spec to `cwd/name.{format}`. Each call writes exactly one file — call it twice if you want both JSON and YAML. It returns the `DocumentFormatData` for the written file.

```typescript
await saveSwagger(spec, {
    cwd: './docs',       // default: process.cwd() (relative paths resolve against it)
    name: 'openapi',     // default: 'swagger' — any trailing .json/.yaml is replaced to match format
    format: 'yaml',      // 'json' | 'yaml' — default: 'json'
});
```

If you need in-memory output only, skip `saveSwagger()` and use the value returned by `generateSwagger()` directly.

## Supported Versions

| Version | `spec.openapi` | Notes |
|---------|---------------|-------|
| `v2`    | swagger 2.0    | Uses `x-nullable`, `x-deprecated`, flattens intersection types |
| `v3`    | `3.0.0`        | Uses `nullable`, `deprecated`, `allOf` for intersections, `requestBody`; strips `$ref` siblings for spec compliance |
| `v3.1`  | `3.1.0`        | Same emitter as `v3`; allows `$ref` siblings (OpenAPI 3.1 relaxed that restriction) |
| `v3.2`  | `3.2.0`        | Same emitter as `v3.1` |

Version-specific differences that matter most:

- **Nullable types**: V2 emits `x-nullable: true` (non-standard); V3 uses `nullable: true`.
- **Request body**: V2 emits `in: body` parameters; V3 emits a top-level `requestBody`.
- **File uploads**: V2 uses `type: file` formData; V3 uses `multipart/form-data` request bodies.
- **Intersections**: V2 flattens all member properties into the object; V3 emits `allOf`.

## Structure

```
src/
├── core/         # Domain types, config, OpenAPI schema types, errors
│   ├── config/
│   ├── schema/v2, v3
│   └── utils/
├── adapters/     # Emitters (V2Generator, V3Generator)
│   └── generator/abstract.ts, v2/, v3/
├── app/          # Orchestration (generateSwagger, saveSwagger)
└── index.ts      # Public entry point
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
