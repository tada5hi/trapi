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
| **Type resolver** | `packages/cli/src/metadataGeneration/typeResolver.ts` | `packages/metadata/src/resolver/module.ts` |
| **Metadata generator** | `packages/cli/src/metadataGeneration/metadataGenerator.ts` | `packages/metadata/src/generator/metadata/module.ts` |
| **Controller generator** | `packages/cli/src/metadataGeneration/controllerGenerator.ts` | `packages/metadata/src/generator/controller/module.ts` |
| **Parameter generator** | `packages/cli/src/metadataGeneration/parameterGenerator.ts` | `packages/metadata/src/generator/parameter/module.ts` |
| **Method generator** | `packages/cli/src/metadataGeneration/methodGenerator.ts` | `packages/metadata/src/generator/method/module.ts` |
| **Swagger generator (v2)** | `packages/cli/src/swagger/specGenerator2.ts` | `packages/swagger/src/generator/v2/module.ts` |
| **Swagger generator (v3)** | `packages/cli/src/swagger/specGenerator3.ts` | `packages/swagger/src/generator/v3/module.ts` |
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

## Areas to Watch

When tsoa updates, review for:
- New OpenAPI 3.1 features (nullable → type arrays, discriminator improvements)
- Type resolution improvements (utility types, template literals, mapped types)
- Decorator patterns and metadata extraction strategies
- Error handling and diagnostic improvements
- Performance optimizations in the compiler API usage
