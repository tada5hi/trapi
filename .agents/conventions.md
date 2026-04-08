# Conventions

## Commit Messages

Conventional Commits enforced via commitlint + husky `commit-msg` hook.

```bash
# Interactive commit helper
npm run commit   # runs git-cz
```

Format: `type(scope): description` — e.g., `fix(metadata): handle generic type parameters correctly`

## Linting

ESLint with `@tada5hi/eslint-config-typescript`. Run:

```bash
npm run lint        # check
npm run lint:fix    # auto-fix
```

Key rule overrides: `class-methods-use-this` disabled, `no-continue` disabled, `no-shadow` disabled.

## Build

- **Target**: ES2020, CommonJS modules
- **Compiler options**: `experimentalDecorators` and `emitDecoratorMetadata` enabled
- **Output**: `dist/` with declarations and source maps
- **Clean build**: Each package uses `rimraf dist/` before building

NX caches build, lint, and test targets. Build dependencies are configured so packages build in correct order.

## TypeScript

- Peer dependency on TypeScript 4.7–5.x
- The metadata package uses the TypeScript compiler API directly (`ts.createProgram`, type checker, AST traversal)
- Base `tsconfig.json` sets `noEmit: true`; `tsconfig.build.json` overrides for production builds

## CI/CD

GitHub Actions workflow (`.github/workflows/main.yml`):

1. **Install** — checkout + `npm install`
2. **Build** — `npx nx run-many -t build`
3. **Lint** — ESLint (depends on build)
4. **Test** — Jest (depends on build)
5. **Docs** — VitePress build + GitHub Pages deploy (master only)

## Releases

Automated via Release Please (`google-github-actions/release-please-action@v4`):

- Triggered on master push
- Creates release PRs with changelogs
- On merge, publishes to npm via `workspaces-publish`
- `metadata`, `swagger`, and `decorators` use linked versioning
- Preset packages version independently
