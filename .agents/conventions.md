# Conventions

## Commit Messages

Conventional Commits enforced via commitlint + husky `commit-msg` hook.

```bash
# Interactive commit helper
npm run commit   # runs git-cz
```

Format: `type(scope): description` — e.g., `fix(metadata): handle generic type parameters correctly`

## Linting

ESLint 10 with flat config (`eslint.config.js`), extends `@tada5hi/eslint-config`. Run:

```bash
npm run lint        # check
npm run lint:fix    # auto-fix
```

Key rule overrides: `class-methods-use-this` disabled, `no-continue` disabled. Test data and decorator source files have `no-unused-vars` disabled.

## Build

Each package has three build scripts:

- `build:js` — tsdown (produces `.mjs` + `.d.mts` in `dist/`)
- `build:types` — `tsc -p tsconfig.build.json` (typecheck only, no emit)
- `build` — runs both sequentially

NX caches build, lint, and test targets. Build dependencies (`^build`) ensure packages build in correct dependency order.

## TypeScript

- **Target**: ES2022, ESNext modules, bundler module resolution
- **Base config**: extends `@tada5hi/tsconfig` with overrides
- **Module format**: ESM (`.mjs` output via tsdown)
- **Decorators**: `experimentalDecorators: true` enabled
- **Strict mode**: Currently disabled (`strict: false`); see `.agents/plans/001-enable-strict-typescript.md` for the incremental re-enablement plan
- Peer dependency on TypeScript >=5.0.0 (root devDependency: ^6.0.2)
- See `.agents/plans/002-typescript-6-migration.md` for TS6 migration details, compiler API audit, and decorator roadmap
- The metadata package uses the TypeScript compiler API directly (`ts.createProgram`, type checker, AST traversal)

## Imports

- **Always use top-level imports** — never use inline `import()` type annotations (e.g., `param: import('foo').Bar`). Use a top-level `import type { Bar } from 'foo'` instead. The ESLint rule `@typescript-eslint/consistent-type-imports` enforces this.

## Interface vs Type

Use `interface` **only** when it is implemented by a class. Prefix it with `I` (e.g., `IFoo` for `class Foo implements IFoo`). For all other type definitions (data shapes, options objects, unions, mapped types), use `type`.

- **`interface IFoo { ... }`** — Only when `class Foo implements IFoo { ... }` exists
- **`type Foo = { ... }`** — For data shapes, options, DTOs, discriminated unions, and everything else
- **Reference the interface**, not the class, in constructor parameters, fields, and function signatures
- **Import the interface** (`import type { IFoo }`) instead of the class when only the type is needed

This enables testability (mock implementations), decoupling (no circular class imports), and makes the dependency graph explicit.

> **Migration note**: Many existing data shapes (e.g., `Controller`, `Method`, `Parameter`, `BaseType`) still use `interface`. These should be converted to `type` incrementally.

## File Organization

- **`types.ts`** — Only types and interfaces. No functions, no classes, no constants. Every directory that has types uses `types.ts` (not `type.ts`).
- **`constants.ts`** — Enums, `as const` objects, and other constant values.
- **`module.ts`** — Primary class or function implementations.
- **`utils.ts`** — Helper/utility functions.
- **Type guards** (e.g., `isFooType()`) are functions — they belong in a dedicated `type-guards.ts` or `utils.ts`, not in `types.ts`.
- **Do not re-export types from external libraries** (e.g., `export type { CompilerOptions }` from `typescript`). Consumers should import directly from the source library. Wrapper type aliases (e.g., `TsCompilerOptions = CompilerOptions`) are acceptable when they add semantic meaning.

## CI/CD

GitHub Actions workflow (`.github/workflows/main.yml`):

1. **Install** — checkout + `npm ci` (Node 22)
2. **Build** — `npm run build` (tsdown + typecheck)
3. **Lint** — ESLint (depends on build)
4. **Test** — Vitest (depends on build)
5. **Docs** — VitePress build + GitHub Pages deploy (master only)

## Releases

Automated via Release Please (`google-github-actions/release-please-action@v4`):

- Triggered on master push
- Creates release PRs with changelogs
- On merge, publishes to npm via `tada5hi/monoship@v2`
- `metadata`, `swagger`, and `decorators` use linked versioning
- Preset packages version independently

## References

External project references live in `.agents/references/`. When looking up source code in a referenced project (e.g., tsoa), always update the corresponding reference file with:

- The source file path / function name in the external project
- The corresponding TRAPI file path / function name
- Any behavioral differences between the implementations

This builds a cumulative mapping over time so future work can quickly find corresponding code without re-searching.

## Plans

Plans live in `.agents/plans/` and document future improvements or migration strategies.

- **Numbering**: Every plan gets a sequential number: `# Plan #001: Title`. Use zero-padded 3-digit format.
- **Filename**: Prefix the filename with the plan number: `001-enable-strict-typescript.md`, `002-typescript-6-migration.md`.
- **GitHub issues**: If a plan has an associated issue, append it: `# Plan #002: Title (#755)`.
- **Numbering without issues**: Plans without a GitHub issue still get a number for easy reference.
- **New plans**: Check the highest existing plan number and increment.
