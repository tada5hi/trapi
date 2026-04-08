<!-- NOTE: Keep this file and all corresponding files in the .agents directory updated as the project evolves. When making architectural changes, adding new patterns, or discovering important conventions, update the relevant sections. -->

# TRAPI — Agent Guide

TRAPI (TypeScript REST API) is a monorepo that generates REST API metadata and OpenAPI/Swagger documentation from TypeScript decorators. It analyzes decorated source code using the TypeScript compiler, extracts a normalized metadata representation, and transforms it into OpenAPI 2.0 or 3.0 specifications.

## Quick Reference

```bash
# Setup
npm install

# Development
npx nx run-many -t build
npx nx run-many -t test
npm run lint
```

- **Node.js**: >=22.0.0
- **Package manager**: npm (workspaces)
- **Module format**: ESM (`"type": "module"`)
- **Build orchestrator**: NX + tsdown

Packages are libraries published to npm. The `docs` package is a private VitePress documentation site.

### Packages

| Package | npm Name | Description |
|---------|----------|-------------|
| `packages/metadata` | `@trapi/metadata` | Core: extracts API metadata from TypeScript decorators |
| `packages/swagger` | `@trapi/swagger` | Transforms metadata into OpenAPI 2.0/3.0 specs |
| `packages/decorators` | `@trapi/decorators` | Preset of swagger-related decorators |
| `packages/preset-typescript-rest` | `@trapi/preset-typescript-rest` | Decorator mapping for typescript-rest |
| `packages/preset-decorators-express` | `@trapi/preset-decorators-express` | Decorator mapping for @decorators/express |
| `packages/docs` | _(private)_ | VitePress documentation site |

### Linked Versioning

`@trapi/metadata`, `@trapi/swagger`, and `@trapi/decorators` share a linked version (currently 1.3.0). The preset packages version independently.

## Detailed Guides

- **[Project Structure](.agents/structure.md)** — Source layout, packages, and dependency layers
- **[Architecture](.agents/architecture.md)** — Metadata extraction pipeline, type resolution, and generator patterns
- **[Testing](.agents/testing.md)** — Vitest setup, coverage thresholds, and test patterns
- **[Conventions](.agents/conventions.md)** — Commit conventions, linting, CI/CD, and release process
- **[Plans](.agents/plans/)** — Future improvement plans (strict TypeScript, etc.)
