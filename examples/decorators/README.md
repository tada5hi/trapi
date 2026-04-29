# Example: Decorators + Preset Bundle

A self-contained reference for shipping a custom decorator runtime alongside a
TRAPI v2 `Preset` that recognises it. This example covers the **complete**
shape of a real preset:

- **Routing decorators** — `@Controller`, HTTP verbs (`@Get`, `@Post`, …),
  parameter binders (`@Body`, `@Query`, `@Path`, …).
- **TRAPI markers** — `@Hidden`, `@Tags`, `@Description`, `@Example`,
  `@Extension`, `@Security`, `@Produces`, `@Consumes`, `@Accept`,
  `@Deprecated`, `@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble`.
- **JSDoc tag handlers** — `/** @hidden */`, `/** @deprecated */`,
  `/** @summary */`, etc.

It is the natural starting point for projects that want to grow it into a
real routing runtime (similar to
[`routup/plugins`](https://github.com/Tada5hi/routup) for routup) instead of
relying on a third-party decorator library.

## Structure

| Path | Role |
| --- | --- |
| `src/decorators.ts` | Runtime decorator stubs (`@Controller`, `@Get`, `@Body`, …). They are no-ops at runtime — TRAPI only reads their AST shape. |
| `src/preset.ts` | The v2 `Preset` mapping each decorator name to a draft mutation. |
| `fixtures/sample.ts` | A controller using the decorators. |
| `test/preset.spec.ts` | Runs `generateMetadata` and asserts the extracted shape. |

## Run

```bash
npm install
npx nx run @trapi/example-decorators:test
```

## What to copy

When migrating from a different decorator library to TRAPI:

1. Start from `src/preset.ts` — replace each handler's `match.name` with your
   own decorator names. Reuse the helpers (`namedClaim`, `claimParameter`, …).
2. Use `marker: MarkerName.Hidden` (and the other marker values) on handlers
   whose decorators participate in resolver-side concerns (`@Hidden`,
   `@Deprecated`, `@Extension`, `@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble`).
3. Save `preset.ts` either alongside your code (resolved by relative path) or
   as a published npm package (resolved by package name).

## Where the production presets live

Two production-ready presets ship in the workspace:

- [`@trapi/preset-decorators-express`](../../packages/preset-decorators-express)
  for `@decorators/express`.
- [`@trapi/preset-typescript-rest`](../../packages/preset-typescript-rest) for
  `typescript-rest`.

Both pair with a real, externally-defined decorator library — that's the
recommended shape for any preset you publish.

## Growing this into a real runtime

The decorator stubs in `src/decorators.ts` currently do nothing. To make them
useful at runtime you would wire them to a router (Express, Fastify, routup…)
so that `@Controller('/users')` actually mounts a controller and `@Get('/:id')`
actually registers a handler. The TRAPI side stays the same — it reads the AST,
not the runtime — so the preset in `src/preset.ts` keeps working unchanged.
