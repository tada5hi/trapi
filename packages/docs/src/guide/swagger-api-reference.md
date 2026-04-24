# @trapi/swagger — API Reference

Every name in this reference is part of the stable public surface. Anything not documented here should be treated as internal even if it is re-exported.

## Functions

### `generateSwagger(options)`

```typescript
async function generateSwagger<V extends `${Version}`>(
    options: Omit<SwaggerGenerateOptions, 'version'> & { version: V },
): Promise<V extends 'v2' ? SpecV2 : SpecV3>;
```

Produces an OpenAPI document from either pre-built metadata or metadata generation options.

- Returns `SpecV2` when `version` is `'v2'`.
- Returns `SpecV3` when `version` is `'v3'`, `'v3.1'`, or `'v3.2'`.

See [Generating a Spec](/guide/swagger-generation) for usage patterns.

### `saveSwagger(spec, output)`

```typescript
async function saveSwagger(
    spec: SpecV2 | SpecV3,
    output: SwaggerGenerateOutput,
): Promise<Record<string, { path: string; name: string; content: string }>>;
```

Writes the spec to disk as JSON, and optionally YAML. Returns a record of every file written, keyed by filename.

See [Saving Output](/guide/swagger-output) for usage patterns.

## Types

### `SwaggerGenerateOptions`

```typescript
import type { Metadata, MetadataGenerateOptions } from '@trapi/metadata';

type SwaggerGenerateOptions = {
    version: 'v2' | 'v3' | 'v3.1' | 'v3.2';
    metadata: MetadataGenerateOptions | Metadata;
    data?: SwaggerGenerateData;
};
```

When `metadata` is `MetadataGenerateOptions`, `generateSwagger` runs `generateMetadata` internally before emitting.

### `SwaggerGenerateData`

```typescript
type SwaggerGenerateData = {
    name?: string;
    version?: string;
    description?: string;
    license?: string;
    servers?: string | string[] | ServerOption | ServerOption[];
    securityDefinitions?: SecurityDefinitions;
    consumes?: string[];
    produces?: string[];
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
    extra?: Record<string, any>;
};
```

Field-by-field notes in [Document Data](/guide/swagger-document-data).

### `SwaggerGenerateOutput`

```typescript
type SwaggerGenerateOutput = {
    directory?: string;  // default: process.cwd()
    fileName?: string;   // default: 'swagger'
    yaml?: boolean;      // default: false
};
```

### `ServerOption`

```typescript
type ServerOption = {
    url: string;
    description?: string;
};
```

### `SpecV2` / `SpecV3`

The shape of the emitted document. These follow the official OpenAPI 2.0 and 3.0 schemas respectively. The swagger package re-exports them as TypeScript types so you can write utilities over the output without pulling in a third-party type package.

### `Version`

```typescript
enum Version {
    V2 = 'v2',
    V3 = 'v3',
    V3_1 = 'v3.1',
    V3_2 = 'v3.2',
}
```

## Errors

The swagger package throws `SwaggerError` for spec-level problems (duplicate operation IDs, body parameter conflicts, etc.). `MetadataError` subclasses surface through `generateSwagger` when extraction fails.

```typescript
import { isSwaggerError } from '@trapi/swagger';

try {
    await generateSwagger({ ... });
} catch (error) {
    if (isSwaggerError(error)) {
        console.error('Swagger emission failed:', error.message);
    }
    throw error;
}
```

## Re-exports from `@trapi/metadata`

For convenience, `@trapi/swagger` re-exports the metadata types most users need when wiring things up:

- `Metadata`
- `MetadataGenerateOptions`

Import them from `@trapi/metadata` directly if you want a single source of truth.

## Stability

The names above form the stable public contract. Internal emitter classes (`V2Generator`, `V3Generator`, `AbstractGenerator`) and helpers are currently exported for historical reasons but may be hidden in a future major version — rely on the documented surface above.
