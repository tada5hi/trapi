# tsoa Reference

TRAPI draws inspiration from [tsoa](https://github.com/lukeautry/tsoa), a TypeScript/OpenAPI spec generator for Express/Koa/Hapi. The key difference is that TRAPI is **decorator-agnostic** — it works with any decorator-based HTTP framework via configurable presets, while tsoa requires its own decorators.

## Version Snapshot (as of 2026-04-09)

| | Version | Date | Commit |
|---|---------|------|--------|
| **Latest stable** | v6.6.0 | 2024-12-08 | — |
| **Latest pre-release** | v7.0.0-alpha.0 | 2025-12-14 | — |
| **Master HEAD** | — | 2025-12-21 | `f0f9aa792d25c16c6ad4dd152cbac347c5faa471` |

## Areas to Watch

When tsoa updates, review for:
- New OpenAPI 3.1 features (nullable → type arrays, discriminator improvements)
- Type resolution improvements (utility types, template literals, mapped types)
- Decorator patterns and metadata extraction strategies
- Error handling and diagnostic improvements
- Performance optimizations in the compiler API usage
