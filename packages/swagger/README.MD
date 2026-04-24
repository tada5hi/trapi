# @trapi/swagger ⛱

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fswagger.svg)](https://badge.fury.io/js/@trapi%2Fswagger)

Transforms TRAPI metadata into an OpenAPI 2.0 (Swagger) or OpenAPI 3.0 specification and, optionally, writes it to disk as JSON or YAML.

Inspect the `CHANGELOG.md` in the repository for breaking changes.

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

`@trapi/metadata` is a peer dependency and must be installed alongside it:

```bash
npm install --save @trapi/metadata
```

## Usage

`generateSwagger()` accepts either pre-built metadata or metadata generation options — when options are supplied, it runs `generateMetadata()` internally first.

```typescript
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const spec = await generateSwagger({
    version: 'v3',
    metadata: {
        entryPoint: ['src/controllers/**/*.ts'],
        preset: '@trapi/decorators',
    },
    data: {
        name: 'My API',
        version: '1.0.0',
        description: 'Example service',
        servers: 'https://api.example.com',
    },
});

await saveSwagger(spec, { directory: './docs', yaml: true });
```

Reusing pre-built metadata is useful if you need it for more than just OpenAPI generation:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/decorators',
});

const spec = await generateSwagger({
    version: 'v3',
    metadata,
    data: { name: 'My API', version: '1.0.0' },
});
```

## Configuration

```typescript
import type { Metadata, MetadataGenerateOptions } from '@trapi/metadata';

export type SwaggerGenerateOptions = {
    /**
     * OpenAPI spec version to generate.
     * Accepts 'v2', 'v3', 'v3.1', 'v3.2'.
     */
    version: 'v2' | 'v3' | 'v3.1' | 'v3.2';

    /**
     * Pre-built metadata, or options to generate it from source.
     */
    metadata: MetadataGenerateOptions | Metadata;

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

`saveSwagger()` writes the spec to `outputDirectory/outputFileName.json` (and `.yaml` when `yaml: true`). It returns a record of the files written.

```typescript
await saveSwagger(spec, {
    directory: './docs',       // default: process.cwd()
    fileName: 'openapi',       // default: 'swagger'
    yaml: true,                // additionally write openapi.yaml
});
```

If you need in-memory output only, skip `saveSwagger()` and use the value returned by `generateSwagger()` directly.

## Supported Versions

| Version | Emitter | Notes |
|---------|---------|-------|
| `v2`    | OpenAPI 2.0 (Swagger) | Uses `x-nullable`, `x-deprecated`, flattens intersection types |
| `v3`    | OpenAPI 3.0 | Uses `nullable`, `deprecated`, `allOf` for intersections, `requestBody` |
| `v3.1`  | OpenAPI 3.1 | Same as 3.0 emitter with 3.1 schema header |
| `v3.2`  | OpenAPI 3.2 | Same as 3.0 emitter with 3.2 schema header |

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
├── adapters/     # Emitters (V2Generator, V3Generator) and file writer (saveSwagger)
│   ├── generator/abstract.ts, v2/, v3/
│   └── save/
├── app/          # Orchestration (generateSwagger)
└── index.ts      # Public entry point
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
