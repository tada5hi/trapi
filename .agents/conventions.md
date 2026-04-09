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

## Plans

Plans live in `.agents/plans/` and document future improvements or migration strategies.

- **Numbering**: Every plan gets a sequential number: `# Plan #001: Title`. Use zero-padded 3-digit format.
- **Filename**: Prefix the filename with the plan number: `001-enable-strict-typescript.md`, `002-typescript-6-migration.md`.
- **GitHub issues**: If a plan has an associated issue, append it: `# Plan #002: Title (#755)`.
- **Numbering without issues**: Plans without a GitHub issue still get a number for easy reference.
- **New plans**: Check the highest existing plan number and increment.
