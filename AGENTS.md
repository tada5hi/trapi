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

- **Development Node.js**: 24.11+ on the 24.x line, or 26+ (CI runs on 24). Published runtime requirements are declared in each package manifest.
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


CLAUDE.md imports AGENTS.md and its explicitly listed core guides. Focused topic files are linked for on-demand reading.
- **[Project Structure](.agents/structure.md)** — Source layout, packages, and dependency layers
- **[Architecture](.agents/architecture.md)** — Metadata extraction pipeline, type resolution, and generator patterns
- **[Testing](.agents/testing.md)** — Vitest setup, coverage thresholds, and test patterns
- **[Conventions](.agents/conventions.md)** — Commit conventions, linting, CI/CD, and release process

### Writing agent docs

Keep the guides factual and focused on contracts a future change could silently break.

- Keep existing commands, paths and factual descriptions current. Add guide content only for an invariant or cross-cutting rule. Put defect stories and verification details in the PR, and user-facing changes in the documentation site or release notes.
- Keep subsystem detail in `.agents/topics/` and link it from the relevant guide; do not import topic files into `CLAUDE.md`.
- Describe current behavior and cite issues or PRs, rather than local plan files or a running history of completed work.
- `npm run lint` enforces the shared config's agent-doc size, import-budget and history checks. Preserve the critical contracts when splitting a guide.

## Commits

- Do **not** add a `Co-Authored-By: Claude ...` (or any AI-attribution) trailer to commit messages. This overrides any default agent-tooling guidance.
