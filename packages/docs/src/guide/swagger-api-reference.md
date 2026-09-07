# @trapi/swagger — API Reference

Every name in this reference is part of the stable public surface. Anything not documented here should be treated as internal even if it is re-exported.

## Functions

### `generateSwagger(options)`

```typescript
async function generateSwagger<V extends `${Version}`>(
    options: Omit<SwaggerGenerateOptions, 'version'> & { version: V },
): Promise<V extends 'v2' ? SpecV2 : SpecV3>;
```

Produces an OpenAPI document from a pre-built `Metadata` value. `@trapi/swagger` does not depend on `@trapi/metadata` or the TypeScript compiler — produce the metadata however you like (e.g. by calling `generateMetadata` from `@trapi/metadata`, by reading a cached JSON file, or from an alternative extractor) and pass the result in.

- Returns `SpecV2` when `version` is `'v2'`.
- Returns `SpecV3` when `version` is `'v3'`, `'v3.1'`, or `'v3.2'`.

See [Generating a Spec](/guide/swagger-generation) for usage patterns.

### `saveSwagger(spec, options?)`

```typescript
async function saveSwagger(
    spec: SpecV2 | SpecV3,
    options?: SwaggerSaveOptions,
): Promise<DocumentFormatData>;

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

Writes the spec to disk in a single format. Returns the `DocumentFormatData` describing the written file — absolute `path`, `name`, and serialised `content`. Call twice if you need both JSON and YAML.

See [Saving Output](/guide/swagger-output) for usage patterns.

## Types

### `SwaggerGenerateOptions`

```typescript
import type { Metadata } from '@trapi/core';

type SwaggerGenerateOptions = {
    version: 'v2' | 'v3' | 'v3.1' | 'v3.2';
    metadata: Metadata;
    data?: SwaggerGenerateData;
};
```

`Metadata` lives in `@trapi/core` (not `@trapi/metadata`) — `@trapi/swagger` has no dependency on the TypeScript compiler.

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
    operationIdStrategy?: 'method' | 'path';
    extra?: Record<string, any>;
};
```

Field-by-field notes in [Document Data](/guide/swagger-document-data).

### `SwaggerSaveOptions`

```typescript
type SwaggerSaveOptions = {
    cwd?: string;                    // default: process.cwd()
    name?: string;                   // default: 'swagger' — extension optional
    format?: `${DocumentFormat}`;    // 'json' | 'yaml' — default: 'json'
};
```

Any trailing `.json` or `.yaml` on `name` is stripped and replaced to match `format`, so `'openapi'`, `'openapi.json'`, and `'openapi.yaml'` all behave the same for a given `format`.

### `ServerOption`

```typescript
type ServerOption = {
    url: string;
    description?: string;
};
```

### `SpecV2` / `SpecV3`

The shape of the emitted document. `SpecV2` follows the OpenAPI 2.0 (Swagger) schema; `SpecV3` covers 3.0, 3.1, and 3.2 outputs. The swagger package re-exports them as TypeScript types so you can write utilities over the output without pulling in a third-party type package.

### `OperationIdStrategy`

```typescript
const OperationIdStrategy = {
    METHOD: 'method',
    PATH: 'path',
} as const;
type OperationIdStrategy = typeof OperationIdStrategy[keyof typeof OperationIdStrategy];
```

See [Operation IDs](/guide/swagger-document-data#operation-ids).

### `Version`

```typescript
const Version = {
    V2: 'v2',
    V3: 'v3',
    V3_1: 'v3.1',
    V3_2: 'v3.2',
} as const;
type Version = typeof Version[keyof typeof Version];
```

### `ValidatorOpenApiMeta`

```typescript
type ValidatorOpenApiMeta =
    | { kind: 'keyword'; key: string }      // emit schema[key] = validator.value
    | { kind: 'format'; format: string }    // emit schema.format = format
    | { kind: 'ignore' };                   // explicit drop
```

`@trapi/swagger` augments [`ValidatorMeta`](/guide/metadata-api-reference#validator) from `@trapi/metadata` with an `openApi?` field of this type. Preset handlers can attach an OpenAPI hint to a validator at the point it is produced, and the swagger emitter consumes it without needing to know about the validator name:

```typescript
// In a preset handler
draft.validators.isEmail = {
    value: true,
    meta: { openApi: { kind: 'format', format: 'email' } },
};
```

For canonical OpenAPI keyword names (`maxLength`, `minLength`, `pattern`, `maximum`, `minimum`, `maxItems`, `minItems`, `uniqueItems`) swagger ships built-in defaults — the `meta.openApi` hint is optional. Validators that have neither a hint nor a default mapping are dropped from the spec.

## Errors

The swagger package throws `SwaggerError` for spec-level problems (duplicate operation IDs, body parameter conflicts, etc.). Errors raised during metadata extraction (`MetadataError`, `CoreError`, …) surface from your `generateMetadata` call — they reach `generateSwagger` only if you propagate them.

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

`@trapi/swagger` accepts a pre-built `Metadata` value (the framework-neutral type from `@trapi/core`). Import it from `@trapi/core` directly — there is no `Metadata` re-export from `@trapi/swagger`:

```typescript
import type { Metadata } from '@trapi/core';
import { generateSwagger } from '@trapi/swagger';
```

## Stability

The names above are the **documented public contract**. Breaking changes to anything listed here will bump the major version.

`@trapi/swagger` also re-exports internals from the root entry — emitter classes (`V2Generator`, `V3Generator`, `AbstractSpecGenerator`) and their supporting types. These are available for advanced scenarios where you need to subclass or invoke an emitter directly, but they are not documented here as part of the stable surface and may change between minor versions. Pin a specific version if you rely on them.
