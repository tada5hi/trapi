# routup Reference

[routup](https://github.com/routup) is a routing library that ships its own decorator + swagger plugins consuming `@trapi/metadata` and `@trapi/swagger`. The repo `routup/plugins` (cloned locally at `/opt/projects/routup/plugins`) hosts the decorator presets and the swagger plugin that bridges routup decorators into the TRAPI pipeline.

## Version Snapshot (as of 2026-04-26)

| | Version | Notes |
|---|---|---|
| `@routup/decorators` | 3.4.3 | Runtime decorators only — no metadata extraction |
| `@routup/swagger-preset` | 2.4.3 | Was `DecoratorConfig[]` (v1), migrated to v2 `Preset` on PR #798 of TRAPI |
| `@routup/swagger` | 2.4.3 | Wraps `@trapi/swagger`'s `generateSwagger()` with routup-friendly defaults |
| `routup` (peer) | ^5.0.0-beta.4 | |

## Local Path

```
/opt/projects/routup/plugins/
├── packages/
│   ├── decorators/         # Runtime decorators (D-prefixed: @DController, @DGet, ...)
│   ├── swagger-preset/     # TRAPI v2 Preset that maps the D-prefixed names
│   └── swagger/            # generate() wrapper around @trapi/swagger
```

## Decorator → v2 Handler Mapping

The `@routup/swagger-preset` package translates routup's `D*` decorator names into a v2 `Preset` consumed by `@trapi/metadata`. Source files live under `packages/swagger-preset/src/`:

| File | Handlers |
|---|---|
| `class.ts` | `@DController` (controller path) |
| `method.ts` | `@DGet @DPost @DPut @DPatch @DDelete @DAll @DHead @DOptions` (verb + path) |
| `parameter.ts` | `@DContext @DRequest @DResponse @DNext @DQuery @DBody @DHeader @DHeaders @DCookie @DCookies @DPath @DPaths` |
| `swagger.ts` | `@DConsumes @DDeprecated @DDescription @DExample @DHidden @DSecurity @DTags` (controller- and method-level) |
| `module.ts` | `buildPreset()` — assembles the `Preset` |
| `index.ts` | Default export = the assembled `Preset` |

Each handler is a v2 builder (`controller(...)`, `method(...)`, `parameter(...)` from `@trapi/metadata`) and most carry a `marker` (`MarkerName.Hidden`, `MarkerName.Deprecated`) so the type resolver can discover renamed `D*` decorators on properties without hardcoding names.

### Detail: dual-form parameter decorators

routup's `@DBody`, `@DQuery`, `@DCookie`, `@DHeader` accept an optional name argument. The handler chooses kind based on whether the argument is present:

| Decorator | No arg | With name arg |
|---|---|---|
| `@DBody()` | `ParamKind.Body` | `ParamKind.BodyProp` + name |
| `@DQuery()` | `ParamKind.Query` | `ParamKind.QueryProp` + name |
| `@DCookie('x')` | n/a (always single) | `ParamKind.Cookie` + name |
| `@DHeader('x')` | n/a (always single) | `ParamKind.Header` + name |
| `@DCookies()` | `ParamKind.Cookie` (bulk) | n/a |
| `@DHeaders()` | `ParamKind.Header` (bulk) | n/a |
| `@DPath('x')` | n/a | `ParamKind.Path` + name |
| `@DPaths()` | `ParamKind.Path` (bulk) | n/a |

This mirrors the optional/required signatures in `packages/decorators/src/parameter/index.ts`:
- `DBody(property?)`, `DQuery(property?)` — optional
- `DPath(property)`, `DCookie(property)`, `DHeader(property)` — required
- `DPaths()`, `DCookies()`, `DHeaders()` — no-arg bulk

## `generate()` Wrapper (`packages/swagger/src/generator/module.ts`)

routup's `generate()` is a thin wrapper around `@trapi/swagger`'s `generateSwagger()`. It:

1. Merges `DEFAULT_DATA` (`name`, `description`, `consumes: ['application/json']`, `produces: ['application/json']`) into `context.options`.
2. Defaults `metadata.entryPoint` to `{ pattern: '**/*.ts', cwd: <cwd>/src }` if not provided.
3. Defaults `metadata.preset` to `'@routup/swagger-preset'` if not provided.
4. Forwards `context.tsconfig` into `metadata.tsconfig`.
5. Calls `generateSwagger({ version, metadata, data })`.

`context.options` extends `SwaggerGenerateData` (servers/name/description/license/...) plus a `metadata` field — flatter than the v1 `{ options: { metadata, ...spec } }` shape.

## Behavioral Differences vs v1

| Aspect | v1 (pre-PR #798) | v2 (current) |
|---|---|---|
| `generate()` from `@trapi/swagger` | `generate({ version, options, tsConfig })` | `generateSwagger({ version, metadata, data })` |
| Preset shape | `PresetSchema = { extends, items: DecoratorConfig[] }` | `Preset = { name, extends?, controllers, methods, parameters, ...JsDoc }` from `@trapi/metadata` |
| File writing | `output: false`, `outputDirectory`, `yaml` on `generate()` | Removed — use `saveSwagger(spec, { cwd, format, name })` separately |
| `Version.V3` output | `openapi: "3.1.0"` | `openapi: "3.0.0"` (use `Version.V3_1` for the old default) |
| Decorator discovery | Hardcoded `DecoratorID` enum names | Match by name + `marker` for resolver-side lookup |
| Hidden/deprecated propagation | Hardcoded names in resolver | `marker: MarkerName.Hidden`/`Deprecated` flows through `namesForMarker` |

## Test Fixtures

`packages/decorators/test/data/` contains controllers exercised by both decorator runtime tests AND the swagger spec tests (the swagger tests resolve `path.resolve(process.cwd(), '..', 'decorators', 'test', 'data')` from the swagger package).

| Fixture | Coverage |
|---|---|
| `combined.ts` | Multi-verb controller, middlewares, `@DPath`, `@DPaths` |
| `get.ts` | `@DGet`, `@DExample<T>`, `@DPath`, `@DPaths` |
| `post.ts` | `@DBody()` and `@DBody('foo')` (Body vs BodyProp) |
| `query.ts` | `@DQuery()` and `@DQuery('foo')` |
| `cookie.ts` | `@DCookies()` and `@DCookie('foo')` |
| `header.ts` | `@DHeaders()` and `@DHeader('connection')` |
| `middleware.ts` | Middleware-only controller |

Swagger tests live at `packages/swagger/test/unit/generator/{v2,v3}/module.spec.ts` — they call `generate()` and assert with `jsonata` expressions. There's also a static `packages/swagger/test/data/swagger.json` fixture used **only** by `packages/swagger/test/unit/ui/module.spec.ts` (the swagger UI handler test) — it's unrelated to spec generation and isn't auto-regenerated.

## Updating routup for new TRAPI changes

When making API changes in TRAPI that touch routup, the four moving parts are:

1. **`@routup/swagger-preset`** — the v2 `Preset` shape (handlers, markers, draft fields).
2. **`@routup/swagger` types** — re-exports of TRAPI types (`SwaggerGenerateData`, `Metadata`, `Version`, `TsConfig`, ...).
3. **`@routup/swagger` `generate()` wrapper** — option shape mirroring `SwaggerGenerateOptions`.
4. **swagger tests** — `generate()` call site uses the wrapper's option shape.

Quick-check workflow:

```bash
cd /opt/projects/routup/plugins
npx nx run @routup/swagger-preset:build
npx nx run @routup/swagger:build
npx nx run @routup/swagger:test    # 22 tests
npx nx run @routup/decorators:test # 7 tests
```

## Pre-release versions via pkg.pr.new

routup pulls TRAPI builds from pkg.pr.new for unreleased changes. **Gotcha**: the alias form `https://pkg.pr.new/@trapi/metadata@<PR>` 302-redirects to a path with the GitHub owner casing-sensitive (`Tada5hi` capital T → 404). Always use the **lowercase + commit SHA** form in `package.json`:

```jsonc
{
  "dependencies": {
    "@trapi/metadata": "https://pkg.pr.new/tada5hi/trapi/@trapi/metadata@<sha7>",
    "@trapi/swagger": "https://pkg.pr.new/tada5hi/trapi/@trapi/swagger@<sha7>"
  }
}
```

The PR-comment-style URL (`@<PR-number>`) is a convenience for `npm i` on the command line; it's unreliable in `package.json` until pkg.pr.new fixes the redirect casing.

## Migration history

- **PR tada5hi/trapi#798** (2026-04): migrated routup/plugins to TRAPI v2 (`Preset` + handlers, `generateSwagger()`, dropped legacy `output`/`outputDirectory`/`yaml` options).
