# Testing

## Setup

- **Framework**: Vitest 4
- **Coverage**: v8 provider (built-in)
- **Pattern**: `*.spec.ts` and `*.test.ts` files in `test/unit/` directories
- **Config**: Per-package `test/vitest.config.ts`

## Running Tests

```bash
# All packages
npx nx run-many -t test

# Single package
npx nx run @trapi/metadata:test
npx nx run @trapi/swagger:test

# With coverage
npx nx run @trapi/metadata:test:coverage
```

## Coverage Thresholds

The `@trapi/metadata` package enforces coverage minimums:

| Metric     | Threshold |
|------------|-----------|
| Branches   | 58%       |
| Functions  | 77%       |
| Lines      | 73%       |
| Statements | 73%       |

The `@trapi/swagger` package: branches 58%, functions 77%, lines 70%, statements 70%.

Coverage excludes: `.d.ts` files, decorator mapper functions, resolver TS-specific functions, validator utilities.

## Test Structure

Tests are organized by module:

```
packages/metadata/test/
├── vitest.config.ts
├── unit/
│   ├── cache.spec.ts
│   ├── decorator/
│   ├── generator/
│   │   ├── metadata.spec.ts       # Core metadata generation
│   │   ├── reference-types.spec.ts # Reference type resolution
│   │   ├── controller.spec.ts     # Controller-level metadata (tags, paths, methods, JSDoc)
│   │   ├── parameters.spec.ts     # Parameter extraction (query, body, form, path, defaults)
│   │   ├── responses.spec.ts      # Response descriptions, examples, produces
│   │   ├── security.spec.ts       # Security scheme extraction and inheritance
│   │   ├── complex-types.spec.ts  # Circular refs, generics, intersections, nullable, Record
│   │   └── error-paths.spec.ts    # Invalid inputs, empty metadata, edge cases
│   ├── resolver/
│   └── utils/
└── data/         # Test fixtures (controller files with decorators)

packages/swagger/test/
├── vitest.config.ts
├── helpers/
│   ├── metadata-builder.ts  # Typed factory functions for inline metadata fixtures
│   └── schema-validator.ts  # OAI JSON Schema validation (Draft-04 + 2020-12)
├── schemas/
│   ├── v2.0-schema.json     # Official OAI Swagger 2.0 JSON Schema
│   ├── v3.0-schema.json     # Official OAI OpenAPI 3.0 JSON Schema
│   └── v3.1-schema.json     # Official OAI OpenAPI 3.1 JSON Schema
├── unit/
│   ├── specification/  # Endpoint specification tests
│   └── utils/
└── data/         # Test fixtures (pre-built metadata.json)
```

## Test Patterns

- Tests import `describe`, `it`, `expect`, etc. explicitly from `vitest`
- **Metadata tests** use fixture controller files in `test/data/` decorated with TRAPI decorators, then verify the extracted metadata structure
- **Swagger tests (legacy)** load pre-built `metadata.json` via `locter`, generate specs, and assert with `jsonata` expressions
- **Swagger tests (spec compliance)** construct metadata inline using `test/helpers/metadata-builder.ts` factory functions, generate specs, and assert directly on the output objects. This pattern is self-contained, tests exactly one behavior per test, and doesn't depend on shared fixture files.
- Tests that need the TypeScript compiler create a program from fixture files and pass it to the generators

## Swagger Spec Compliance Tests

The following test files use inline metadata to verify OpenAPI compliance:

| File | What it tests |
|------|--------------|
| `ref-sibling-properties.spec.ts` | `$ref` must be the only key in a schema object |
| `nullable-types.spec.ts` | V2 `x-nullable`, V3 `nullable`, nullable refs |
| `enum-compliance.spec.ts` | String/numeric/mixed enums, `x-enum-varnames`, V3 `anyOf` |
| `multiple-responses.spec.ts` | Multiple status codes, void 204, response examples |
| `security-schemes.spec.ts` | Basic, API key, OAuth2 flows, AND/OR security |
| `file-upload.spec.ts` | V2 `type: file` formData, V3 multipart requestBody |
| `intersection-types.spec.ts` | V2 flattened properties, V3 `allOf` |
| `additional-properties.spec.ts` | V2 boolean vs V3 typed schema |
| `edge-cases.spec.ts` | Empty required arrays, void responses, spec structure |
| `error-paths.spec.ts` | Duplicate body params, body+form conflict, cookie filtering, hidden methods |
| `schema-validation.spec.ts` | V2/V3 output validated against official OAI JSON Schemas |
| `config-variations.spec.ts` | specificationExtra merging, collectionFormat, info defaults |
