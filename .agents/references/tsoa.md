# tsoa Reference

TRAPI draws inspiration from [tsoa](https://github.com/lukeautry/tsoa), a TypeScript/OpenAPI spec generator for Express/Koa/Hapi. The key difference is that TRAPI is **decorator-agnostic** — it works with any decorator-based HTTP framework via configurable presets, while tsoa requires its own decorators.

## Version Snapshot (as of 2026-04-09)

| | Version | Date | Commit |
|---|---------|------|--------|
| **Latest stable** | v6.6.0 | 2024-12-08 | — |
| **Latest pre-release** | v7.0.0-alpha.0 | 2025-12-14 | — |
| **Master HEAD** | — | 2025-12-21 | `f0f9aa792d25c16c6ad4dd152cbac347c5faa471` |

## Code Mapping (tsoa → TRAPI)

| Concept | tsoa | TRAPI |
|---------|------|-------|
| **Type resolver** | `packages/cli/src/metadataGeneration/typeResolver.ts` | `packages/metadata/src/adapters/typescript/resolver/module.ts` |
| **Metadata generator** | `packages/cli/src/metadataGeneration/metadataGenerator.ts` | `packages/metadata/src/app/generator/metadata/module.ts` |
| **Controller generator** | `packages/cli/src/metadataGeneration/controllerGenerator.ts` | `packages/metadata/src/app/generator/controller/module.ts` |
| **Parameter generator** | `packages/cli/src/metadataGeneration/parameterGenerator.ts` | `packages/metadata/src/app/generator/parameter/module.ts` |
| **Method generator** | `packages/cli/src/metadataGeneration/methodGenerator.ts` | `packages/metadata/src/app/generator/method/module.ts` |
| **Swagger generator (v2)** | `packages/cli/src/swagger/specGenerator2.ts` | `packages/swagger/src/adapters/generator/v2/module.ts` |
| **Swagger generator (v3)** | `packages/cli/src/swagger/specGenerator3.ts` | `packages/swagger/src/adapters/generator/v3/module.ts` (covers 3.0, 3.1, 3.2) |
| **Ref name sanitization** | `TypeResolver.getRefTypeName()` | `TypeNodeResolver.getRefTypeName()` |
| **Decorator config** | Built-in decorators only | Configurable via `DecoratorConfig` presets |

### Reference Name Sanitization

Both tsoa and TRAPI use similar `getRefTypeName()` logic to produce OpenAPI-safe reference names:

| Character | tsoa | TRAPI |
|-----------|------|-------|
| `<>` | → `_` (then stripped) | → `_` (then stripped) |
| `{}` | → `_` (then stripped) | → `_` (then stripped) |
| `&` | → `-and-` | → `-and-` (or `--` in utility types) |
| `\|` | → `-or-` | → `-or-` (or `--` in utility types) |
| `[]` | → `-Array` | → `-array` |
| `,` | → `.` | → `.` |
| Quotes | stripped | stripped |
| Hyphens | **preserved** | **preserved** (since Plan #003) |
| Other special chars | → `_charCode_` | → `encodeURIComponent` |

Key difference: tsoa uses `_charCode_` encoding for remaining special chars, TRAPI uses `encodeURIComponent`.

### Collision Detection

tsoa has `CheckExpressionUnicity()` — throws if different type expressions map to the same reference name. TRAPI does not currently have this check (potential future improvement).

## Test Structure

tsoa has comprehensive tests in `/tests/`:

| Directory | What |
|-----------|------|
| `tests/unit/swagger/` | ~25 spec test files (definitions, schema details v2/v3/v3.1, routes per HTTP method, security, params, config) |
| `tests/unit/swagger/definitionsGeneration/` | Schema definition generation (largest suite, 1000+ lines) |
| `tests/unit/metadataGeneration/` | Metadata extraction from controllers |
| `tests/fixtures/` | 109 test files: 60+ controllers, `testModel.ts` with 100+ properties |
| `tests/unit/utilities/` | Helper functions: `verifyPath`, `verifyParameter` |

### Key test files for reference
- `definitions.spec.ts` — Most comprehensive: all type constructs, generics, unions, intersections, utility types, discriminated unions
- `schemaDetails.spec.ts` / `schemaDetails3.spec.ts` / `schemaDetails31.spec.ts` — Version-specific schema validation
- `complexTypeResolution.spec.ts` — Advanced type handling (Zod, generics, mapped types)
- `getRoutes.spec.ts` — Parameter and response testing (also postRoutes, putRoutes, etc.)
- `securityRoutes.spec.ts` — Security scheme and scope handling

### Test patterns
- Property-by-property assertions (not snapshots)
- Multiple config variations tested against same specs (`specDefault`, `specWithNoImplicitExtras`, etc.)
- Metadata-first approach: generate metadata → generate spec → assert on spec
- Error testing: try/catch with `expect(err.message).to.match(...)` 
- Utility functions for reusable assertions (`VerifyPath`, `VerifyPathableParameter`)
- No external OpenAPI validator — structural compliance checks only

### tsoa test scenarios TRAPI doesn't cover yet
- Discriminated unions with `oneOf` + `discriminator`
- Zod type inference (`z.infer<Schema>`)
- Getter properties in classes
- Template literal types
- `noImplicitAdditionalProperties` config variations
- Duplicate route path detection (error case)
- Response headers (class-based and object-based)
- Renamed/aliased imports
- Sub-resource routes
- ~12 invalid controller fixtures for error path testing

## Areas to Watch

When tsoa updates, review for:
- New OpenAPI 3.1 features (nullable → type arrays, discriminator improvements)
- Type resolution improvements (utility types, template literals, mapped types)
- Decorator patterns and metadata extraction strategies
- Error handling and diagnostic improvements
- Performance optimizations in the compiler API usage
