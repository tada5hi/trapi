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
│   │   ├── metadata.spec.ts          # Core metadata generation
│   │   ├── generate-metadata.spec.ts # generateMetadata() entry-point scenarios
│   │   ├── reference-types.spec.ts   # Reference type resolution
│   │   ├── controller.spec.ts        # Controller-level metadata (tags, paths, methods, JSDoc)
│   │   ├── parameters.spec.ts        # Parameter extraction (query, body, form, path, defaults)
│   │   ├── responses.spec.ts         # Response descriptions, examples, produces
│   │   ├── security.spec.ts          # Security scheme extraction and inheritance
│   │   ├── complex-types.spec.ts     # Circular refs, generics, intersections, nullable, Record
│   │   ├── conditional-types.spec.ts # Conditional and mapped type resolution
│   │   ├── utility-types.spec.ts     # Partial/Pick/Omit/Record/NonNullable/... coverage
│   │   ├── never-type.spec.ts        # never in returns, unions, and exhaustive checks
│   │   └── error-paths.spec.ts       # Invalid inputs, empty metadata, edge cases
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
│   ├── v3.0-schema.yaml     # YAML copy of the 3.0 schema
│   └── v3.1-schema.json     # Official OAI OpenAPI 3.1 JSON Schema (also used for 3.2 output)
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

## Assertion Conventions

### Assert the exact shape — never branch on type

**Bad** — conditional assertions silently pass when no branch matches:
```typescript
if (type.typeName === 'refAlias') {
    expect(alias.type.typeName).toEqual('nestedObjectLiteral');
} else if (type.typeName === 'refObject') {
    expect(obj.properties).toContain('name');
}
// If typeName is neither → zero assertions run, test passes silently
```

**Good** — assert the concrete shape directly:
```typescript
expect(type.typeName).toEqual('refAlias');
const alias = type as RefAliasType;
expect(alias.type.typeName).toEqual('nestedObjectLiteral');
```

### Why this matters

The metadata resolver's output shape for a given input is deterministic. Tests should pin the exact shape, not hedge across possibilities. If the output shape changes, the test should fail explicitly — not silently pass through a different branch.

### Rules

1. **No `if/else` on `typeName`** — assert the expected `typeName` directly with `expect().toEqual()`. If the shape genuinely varies, write separate tests for each case.
2. **No helpers that return `undefined` on mismatch** — helpers that silently return `undefined` when the type doesn't match (e.g., `findObjectLiteral`) mask failures. Assert the type before unwrapping.
3. **Always verify leaf values** — don't stop at `expect(method).toBeDefined()`. Assert property names, property types, required flags, and ref names.
4. **Test fixture types must be used as return types** — if a type alias is defined in a test fixture, it must appear as an actual method return type. Unused type aliases don't test resolution.
5. **Verify `refName` on reference types** — always check `refName` to confirm the right type alias or object was resolved.

## Swagger Spec Compliance Tests

The following test files use inline metadata to verify OpenAPI compliance:

| File | What it tests |
|------|--------------|
| `ref-sibling-properties.spec.ts` | `$ref` must be the only key in a schema object (v3.0); v3.1/v3.2 allow siblings |
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
| `generate-swagger.spec.ts` | `generateSwagger()` entry-point wiring (pre-built metadata vs options) |
| `never-type.spec.ts` | `never` returns emit no schema |
| `union-composition.spec.ts` | Union vs discriminated-union emission |
| `union-type-endpoint.spec.ts` | Union parameter/return types against a live endpoint |
| `primitive-endpoint.spec.ts`, `parameterized-endpoint.spec.ts`, `type-endpoint.spec.ts`, `abstract-entity-endpoint.spec.ts` | End-to-end endpoint coverage from fixture controllers |
| `v3.spec.ts` | V3-family version dispatch (v3 vs v3.1 vs v3.2) |
| `tag-cascade.spec.ts` | Controller→method tag/response cascade in V3, omitted empty `tags` |
| `path-variables.spec.ts` | Undeclared path-template variables synthesized as required path parameters; `data.pathParameters` descriptions for synthesized and declared path parameters |
| `parameter-flags.spec.ts` | `allowEmptyValue` emitted only for query parameters (V3) and nowhere in V2; `allowReserved` never emitted; the only `validateV31Spec` coverage of a document carrying operation parameters — the v3.0 schema is Draft-04 and cannot catch the query-only rule |
| `content-types.spec.ts` | Consumes/produces resolution: method, controller cascade, document defaults, form-data |
