# Installation

Add the package as a dependency:

```bash
npm install --save @trapi/metadata
```

## Peer Requirements

- **Node.js** ≥ 22
- **TypeScript** ≥ 5 — required at runtime because TRAPI drives the TypeScript compiler API to analyse your source. The version from your project is used; TRAPI does not bundle one.

TypeScript is declared as a peer dependency, so your project's `typescript` version is the one TRAPI will use.

## TypeScript 7

TypeScript 7 (the native Go compiler) ships without the JavaScript compiler API that TRAPI drives — `typescript@7` exports only its version. TRAPI therefore keeps using the TypeScript **6** API, which Microsoft publishes for exactly this case as [`@typescript/typescript6`](https://www.npmjs.com/package/@typescript/typescript6). Your build can still run on TypeScript 7.

TRAPI looks for the compiler API in this order:

1. `typescript` — when it is TypeScript 5 or 6 (or aliased to the compat package, see below).
2. `@typescript/typescript6`.

Pick one of these layouts:

```jsonc
// a) Alias layout, as recommended in the TypeScript 7.0 announcement:
//    `npx tsc` runs TS 7, tools importing `typescript` get the TS 6 API.
{
    "devDependencies": {
        "@typescript/native": "npm:typescript@^7.0.2",
        "typescript": "npm:@typescript/typescript6@^6.0.2"
    }
}

// b) Plain TypeScript 7 plus the compat package.
{
    "devDependencies": {
        "@typescript/typescript6": "^6.0.2",
        "typescript": "^7.0.2"
    }
}
```

With only `typescript@7` installed, `generateMetadata()` throws a `ConfigError` with code `CONFIG_COMPILER_API_UNAVAILABLE` that names the fix.

::: warning npm links the wrong `tsc` in layout (b)
`@typescript/typescript6` depends on TypeScript 6, and npm hoists that dependency's `tsc` binary over the one from `typescript@7` — `npx tsc --version` then reports 6.x ([microsoft/TypeScript#64071](https://github.com/microsoft/TypeScript/issues/64071)). pnpm is not affected. Under npm, either use layout (a) or call TypeScript 7 explicitly (`node node_modules/typescript/bin/tsc`).
:::

TRAPI's type declarations reference `typescript`. In layout (b) those types resolve against the version-only TypeScript 7 package, so keep `skipLibCheck: true` (the default in most templates) if your own code type-checks against TRAPI's internals.

Source is parsed with the TypeScript 6 front-end. TypeScript 7.0 has the same language surface as 6.0, so this is lossless today.

## Module Format

`@trapi/metadata` is an ESM-only package. Your project must either set `"type": "module"` in `package.json` or load it via dynamic `import()` from CommonJS.

::: tip Authoring a custom preset?
You don't need `@trapi/metadata` for that. Install [**`@trapi/core`**](https://www.npmjs.com/package/@trapi/core) instead — it ships the IR types, handler/preset types, and authoring helpers (`controller(...)`, `into`, `append`, `flag`, `readString`, …) without pulling in the `typescript` peer dependency. See [Custom Presets](/guide/advanced-custom-presets).
:::

## Bundled With…

You normally install it alongside either `@trapi/swagger` (if you want OpenAPI output) or a consumer you've written yourself:

```bash
# Typical setup
npm install --save @trapi/metadata @trapi/swagger @trapi/preset-decorators-express @decorators/express
```

- `@decorators/express` — runtime decorator library (or [`typescript-rest`](https://github.com/thiagobustamante/typescript-rest), or [your own](/guide/advanced-custom-presets))
- `@trapi/preset-decorators-express` — preset that interprets the chosen decorator vocabulary
- `@trapi/swagger` — OpenAPI emitter
- The TRAPI marker decorators (`@Hidden`, `@Tags`, `@Description`, `@IsInt`, …) are recognised out of the box by both framework presets — no extra package is needed. Write the marker decorators inline yourself or copy from [`examples/decorators`](https://github.com/tada5hi/trapi/tree/master/examples/decorators)

## Verify

Once installed, a minimal smoke test:

```typescript
import { generateMetadata } from '@trapi/metadata';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
});

console.log(metadata.controllers.length, 'controller(s) discovered');
```

If that runs without errors, continue to [Configuration](/guide/metadata-configuration).
