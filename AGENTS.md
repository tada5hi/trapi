<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# TRAPI — Agent Guide

TRAPI (TypeScript REST API) is a monorepo that generates REST API metadata and OpenAPI/Swagger documentation from TypeScript decorators. It analyzes decorated source code using the TypeScript compiler, extracts a normalized metadata representation, and transforms it into OpenAPI 2.0, 3.0, 3.1, or 3.2 specifications.

## Quick Reference

```bash
# Setup
npm install

# Development
npx nx run-many -t build
npx nx run-many -t test
npm run lint
```

- **Node.js**: >=24.0.0
- **Package manager**: npm (workspaces)
- **Module format**: ESM (`"type": "module"`)
- **Build orchestrator**: NX + tsdown

Packages are libraries published to npm. The `docs` package is a private VitePress documentation site.

### Packages

| Package | npm Name | Description |
|---------|----------|-------------|
| `packages/core` | `@trapi/core` | Framework-neutral domain types, decorator/preset machinery, and shared utilities (no `typescript` dep) |
| `packages/metadata` | `@trapi/metadata` | Extracts API metadata from TypeScript decorators using `@trapi/core` contracts |
| `packages/swagger` | `@trapi/swagger` | Transforms metadata into OpenAPI 2.0, 3.0, 3.1 & 3.2 specs |
| `packages/preset-decorators-express` | `@trapi/preset-decorators-express` | Decorator mapping for @decorators/express (self-contained: routing + TRAPI markers + JSDoc) |
| `packages/preset-typescript-rest` | `@trapi/preset-typescript-rest` | Decorator mapping for typescript-rest (self-contained: routing + TRAPI markers + JSDoc) |
| `packages/cli` | `@trapi/cli` | `trapi` CLI wrapping `generateMetadata` + `generateSwagger` + `saveSwagger` |
| `packages/docs` | _(private)_ | VitePress documentation site |
| `examples/decorators` | _(private)_ | Worked example: a custom decorator runtime + matching v2 `Preset` (routing + markers + JSDoc) |

### Linked Versioning

`@trapi/core`, `@trapi/metadata`, and `@trapi/swagger` share a linked version. Preset packages version independently and `peerDependency` on `@trapi/core` (not `@trapi/metadata`) — they only need the contract surface, not the TypeScript-coupled metadata generator.

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — Source layout, packages, and dependency layers
- **[Architecture](.agents/architecture.md)** — Metadata extraction pipeline, type resolution, and generator patterns
- **[Testing](.agents/testing.md)** — Vitest setup, coverage thresholds, and test patterns
- **[Conventions](.agents/conventions.md)** — Commit conventions, linting, CI/CD, and release process

## Commits

- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
