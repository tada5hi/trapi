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
- **Strict mode**: Currently disabled (`strict: false`); re-enablement is tracked as a future plan
- Peer dependency on TypeScript >=5.0.0 (root devDependency in the ^6 line)
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

## String Literals vs Const Objects

Prefer `as const` objects over bare string literal unions for any closed set of named values (decorator targets, parameter kinds, marker names, etc.). Pair the const with a **same-named** type alias resolving to the value union — consumers then write `\`${Name}\`` and get the literal-string union exactly like they did with TypeScript enums.

```ts
export const ParamKind = {
    Body: 'body',
    BodyProp: 'bodyProp',
    Query: 'query',
    // ...
} as const;
// Same-name type alias: lets `${ParamKind}` template-literal types
// resolve to the value union (matching the prior enum ergonomic).
export type ParamKind = typeof ParamKind[keyof typeof ParamKind];
```

- **Use the same name for the const and the type alias.** Value namespace and type namespace are separate in TypeScript — `ParamKind` (value) is the const object, `ParamKind` (type) is the value union. Don't introduce a `*Value` suffix.
- **Reference the type via `` `${ParamKind}` ``** when you want the bare-string union. Reference `ParamKind.Body` when you want the named constant.
- **Public API consumers can use either form.** `ParamKind.Body` is more discoverable and survives renames; the literal `'body'` is more concise. Both type-check against `` `${ParamKind}` ``.
- **Inside this codebase, prefer the const reference** — it's discoverable in IDE autocomplete and shows up in find-all-references. Bare literals are reserved for places where the value is genuinely incidental (e.g. JSDoc tag matching against arbitrary user input).
- **Don't use TypeScript `enum`s** for new code. They're heavier (compile to JS objects with reverse mappings), don't pattern-match like `as const`, and often mismatch the template-literal type ergonomics. Existing enums have been migrated to the same-name pattern above; `` `${ParameterSource}` ``, `` `${MethodName}` ``, and `` `${CollectionFormat}` `` continue to work unchanged.

### Pitfall: value access inside template-literal types

Property access like `Version.V2` only works in **value** position. Inside template-literal types (`` `${...}` ``), the `Version` identifier resolves to the **type** alias — which is a string-literal union with no `.V2` member. The compiler reports `'Version' only refers to a type, but is being used as a namespace here.`

```ts
// ❌ Doesn't compile — `Version.V2` is value access in type position.
type Out<V extends `${Version}`> = V extends `${Version.V2}` ? SpecV2 : SpecV3;

// ✅ Use `typeof Const.MEMBER` to get the literal type.
type Out<V extends `${Version}`> = V extends typeof Version.V2 ? SpecV2 : SpecV3;
```

For reusable wrappers, prefer the type helpers exported alongside the const (e.g. `OutputForVersion<V>` for `Version`) over re-deriving the conditional.

## File Organization

- **`types.ts`** — Only types and interfaces. No functions, no classes, no constants. Every directory that has types uses `types.ts` (not `type.ts`).
- **`constants.ts`** — Enums, `as const` objects, and other constant values.
- **`module.ts`** — Primary class or function implementations.
- **`utils.ts`** — Helper/utility functions.
- **Type guards** (e.g., `isFooType()`) are functions — they belong in a dedicated `type-guards.ts` or `utils.ts`, not in `types.ts`.
- **Do not re-export types from external libraries** (e.g., `export type { CompilerOptions }` from `typescript`). Consumers should import directly from the source library. Wrapper type aliases (e.g., `TsCompilerOptions = CompilerOptions`) are acceptable when they add semantic meaning.

## CI/CD

GitHub Actions workflow (`.github/workflows/main.yml`):

1. **Install** — checkout + `npm ci` (Node 24)
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

## Continuous (preview) releases

`.github/workflows/continuous-release.yml` publishes preview builds via [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new) on every push to `master`/`next`/`beta`/`alpha` and every PR. Reuses the `install` + `build` composite actions and runs `npx pkg-pr-new publish './packages/*'` once. The private `docs` package is auto-skipped.

Requires the [pkg.pr.new GitHub App](https://github.com/apps/pkg-pr-new) to be installed on the repo — without it, the workflow fails. Preview installs look like `npm i https://pkg.pr.new/@trapi/metadata@<sha>`.

## References

External project references live in `.agents/references/`. When looking up source code in a referenced project (e.g., tsoa), always update the corresponding reference file with:

- The source file path / function name in the external project
- The corresponding TRAPI file path / function name
- Any behavioral differences between the implementations

This builds a cumulative mapping over time so future work can quickly find corresponding code without re-searching.

## Plans

Local plan scratchpads live in `.agents/plans/` (gitignored). This is agent-local working state, not a shared convention — substantive plans should live on GitHub as issues or PR descriptions.
