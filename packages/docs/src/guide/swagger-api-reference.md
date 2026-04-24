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
): Promise<Record<`${DocumentFormat}`, DocumentFormatData>>;

interface DocumentFormatData {
    path: string;       // absolute path the file was written to
    name: string;       // filename with extension
    content?: string;   // serialised content (JSON string or YAML string)
}

enum DocumentFormat {
    JSON = 'json',
    YAML = 'yaml',
}
```

Writes the spec to disk as JSON and, when `yaml: true`, also as YAML. Returns a record of the files written. The record's values carry the resolved `path`, `name`, and the serialised `content` as it was written.

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

The shape of the emitted document. `SpecV2` follows the OpenAPI 2.0 (Swagger) schema; `SpecV3` covers 3.0, 3.1, and 3.2 outputs. The swagger package re-exports them as TypeScript types so you can write utilities over the output without pulling in a third-party type package.

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

There is no dedicated type guard — use `instanceof`:

```typescript
import { SwaggerError } from '@trapi/swagger';

try {
    await generateSwagger({ ... });
} catch (error) {
    if (error instanceof SwaggerError) {
        console.error('Swagger emission failed:', error.message);
    }
    throw error;
}
```

## Working with Metadata Types

`@trapi/swagger` consumes types from `@trapi/metadata` — `Metadata` and `MetadataGenerateOptions` — but does not re-export them. Import them from `@trapi/metadata` directly:

```typescript
import type { Metadata, MetadataGenerateOptions } from '@trapi/metadata';
import { generateSwagger } from '@trapi/swagger';
```

## Stability

The names above are the **documented public contract**. Breaking changes to anything listed here will bump the major version.

`@trapi/swagger` also re-exports internals from the root entry — emitter classes (`V2Generator`, `V3Generator`, `AbstractSpecGenerator`) and their supporting types. These are available for advanced scenarios where you need to subclass or invoke an emitter directly, but they are not documented here as part of the stable surface and may change between minor versions. Pin a specific version if you rely on them.
