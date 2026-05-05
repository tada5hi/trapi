# Generating a Spec

`generateSwagger()` is the entry point. It takes a single options object — including a pre-built `Metadata` value — and returns an in-memory OpenAPI document. `@trapi/swagger` does not depend on `@trapi/metadata` or the TypeScript compiler; produce the metadata however you like.

## Minimal Call

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
});

const spec = await generateSwagger({ version: 'v3', metadata });
```

`generateMetadata` (TypeScript-based extractor) and `generateSwagger` (OpenAPI emitter) compose. Reuse the same `metadata` for multiple emit targets so the TypeScript walk runs once:

```typescript
const specV3 = await generateSwagger({ version: 'v3', metadata });
const specV2 = await generateSwagger({ version: 'v2', metadata });
```

## Bringing Your Own Metadata

`generateSwagger` only requires a value matching the framework-neutral [`Metadata`](https://www.npmjs.com/package/@trapi/core) shape (`{ controllers, referenceTypes }`). You can supply one from any source — a JSON cache file, a Babel-based extractor, or a hand-rolled fixture for testing — without installing `@trapi/metadata`:

```typescript
import { promises as fs } from 'node:fs';
import type { Metadata } from '@trapi/core';
import { generateSwagger } from '@trapi/swagger';

const metadata: Metadata = JSON.parse(await fs.readFile('cache/metadata.json', 'utf8'));

const spec = await generateSwagger({ version: 'v3', metadata });
```

## Choosing a Version

| `version` | `spec.openapi` / header | Emitter |
| --- | --- | --- |
| `'v2'` | swagger 2.0 | `V2Generator` |
| `'v3'` | `'3.0.0'` | `V3Generator` in 3.0 mode |
| `'v3.1'` | `'3.1.0'` | `V3Generator` in 3.1-or-later mode |
| `'v3.2'` | `'3.2.0'` | `V3Generator` in 3.1-or-later mode |

The v3.x values all use the same `V3Generator` class but with minor behavioural differences — most visibly, `'v3.1'` and `'v3.2'` allow `$ref` siblings (OpenAPI 3.1 relaxed that restriction), while `'v3'` strips them for spec compliance. The `version` parameter is type-narrowing: the return type of `generateSwagger` is `SpecV2` for `'v2'` and `SpecV3` for any v3.x value.

## Supplying Document Data

Everything on the OpenAPI `info` block, `servers`, `securityDefinitions`, and default content types goes through `data`:

```typescript
await generateSwagger({
    version: 'v3',
    metadata,
    data: {
        name: 'Example API',
        version: '1.0.0',
        description: 'REST API for example service',
        license: 'MIT',
        servers: ['https://api.example.com', 'https://staging.example.com'],
    },
});
```

See [Document Data](/guide/swagger-document-data) for every field.

## Defaults from package.json

If you omit `name`, `version`, `description`, or `license`, TRAPI reads them from the nearest `package.json`. This is convenient during development but easy to overlook — an explicit `data` object is more predictable in CI.

## In-Memory vs Saving

`generateSwagger()` returns the spec as a plain object. You can:

- write it yourself (`fs.writeFileSync(path, JSON.stringify(spec))`)
- pass it to `saveSwagger()` for JSON/YAML output to a directory
- feed it to an in-process renderer (Swagger UI, Redoc)
- serve it directly from an HTTP handler

```typescript
// Served from an Express handler
app.get('/openapi.json', (_, res) => res.json(spec));
```

For file output, see [Saving Output](/guide/swagger-output).
