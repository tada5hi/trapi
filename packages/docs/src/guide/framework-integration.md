# Framework Integration

TRAPI does not run inside your HTTP framework — it is a build-time tool. Integration is a matter of pointing `generateMetadata()` at your controller files and telling it which decorators you use.

## Using a Preset

If you use a framework TRAPI already has a preset for, that is the whole setup:

### typescript-rest

```bash
npm install --save @trapi/preset-typescript-rest
```

```typescript
await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-typescript-rest',
});
```

### @decorators/express

```bash
npm install --save @trapi/preset-decorators-express
```

```typescript
await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
});
```

### TRAPI-specific markers

Both framework presets above ship handlers for the TRAPI marker decorators (`@Hidden`, `@Tags`, `@Description`, `@IsInt`, `@Extension`, `@Security`, `@Produces`, `@Consumes`, `@Accept`, `@Deprecated`) and JSDoc tags (`/** @hidden */`, `/** @deprecated */`, `/** @summary */`, …). Each preset is **self-contained** — there is no extends-chain, so no risk of duplicate handler invocations when you author a user preset on top.

You can write the marker decorators inline yourself (they are no-op runtime functions) or copy them from [`examples/decorators/src/decorators.ts`](https://github.com/tada5hi/trapi/tree/master/examples/decorators).

## Using a Custom Decorator Set

If your framework is not on the list (or you have home-grown decorators), author a [Custom Preset](/guide/advanced-custom-presets):

```typescript
// my-preset.ts
import {
    type Preset,
    ParamKind,
    controller,
    method,
    parameter,
} from '@trapi/metadata';

const preset: Preset = {
    name: 'my-app/preset',
    controllers: [
        controller({
            match: { name: 'Route', on: 'class' },
            apply: (ctx, draft) => {
                const arg = ctx.argument(0);
                if (arg?.kind === 'literal' && typeof arg.raw === 'string') {
                    draft.paths = [arg.raw];
                } else if (arg?.kind === 'array' && Array.isArray(arg.raw)) {
                    draft.paths = arg.raw.filter((v): v is string => typeof v === 'string');
                } else {
                    draft.paths = [''];
                }
            },
        }),
    ],
    methods: [
        method({
            match: { name: 'HttpGet', on: 'method' },
            apply: (_ctx, draft) => { draft.verb = 'get'; },
        }),
        method({
            match: { name: 'HttpPost', on: 'method' },
            apply: (_ctx, draft) => { draft.verb = 'post'; },
        }),
    ],
    parameters: [
        parameter({
            match: { name: 'FromBody', on: 'parameter' },
            apply: (_ctx, draft) => { draft.in = ParamKind.Body; },
        }),
        parameter({
            match: { name: 'FromQuery', on: 'parameter' },
            apply: (ctx, draft) => {
                const name = ctx.argument(0);
                if (name?.kind === 'literal' && typeof name.raw === 'string') {
                    draft.in = ParamKind.QueryProp;
                    draft.name = name.raw;
                } else {
                    draft.in = ParamKind.Query;
                }
            },
        }),
    ],
};

export default preset;
```

```typescript
// generate-metadata.ts
await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: './my-preset.ts',
});
```

If you intend to reuse the preset across multiple projects, publish it as an npm package and pass the package name as `preset`. See [Custom Presets](/guide/advanced-custom-presets) for the full reference.

## Extending an Existing Preset

To add your own decorators on top of a published preset, declare an `extends` chain:

```typescript
const preset: Preset = {
    name: 'my-app/preset',
    extends: ['@trapi/preset-decorators-express'],
    controllers: [
        // Recognise @Route(...) in addition to the inherited @Controller(...)
        controller({
            match: { name: 'Route', on: 'class' },
            apply: (ctx, draft) => {
                const arg = ctx.argument(0);
                draft.paths = arg?.kind === 'literal' && typeof arg.raw === 'string' ? [arg.raw] : [''];
            },
        }),
    ],
};
```

By default, parent and child handlers are additive — both decorator names are recognised. To shadow a parent handler, set `replaces: true` (or `replaces: '<parentPresetName>'` to scope the override).

## What TRAPI Does Not Do

- **It does not register routes.** That is your framework's job.
- **It does not validate requests at runtime.** The generated OpenAPI spec can drive an external validator (`ajv`, `openapi-request-validator`, …) but TRAPI itself produces no runtime code.
- **It does not patch decorators.** If your decorators have side effects, those still run when your application starts — TRAPI only reads their AST annotations at build time.

## Running in CI

The typical pattern is to run metadata generation in a build step, commit the generated spec, and fail the build if the committed spec drifts from what generation produces:

```bash
# package.json
"scripts": {
    "build:openapi": "tsx scripts/generate-openapi.ts",
    "check:openapi": "tsx scripts/generate-openapi.ts && git diff --exit-code docs/"
}
```

Pair with [caching](/guide/metadata-caching) to keep repeated runs fast during local development.

## Type ownership reference

Wrapper packages typically need to forward types from `@trapi/metadata` and `@trapi/swagger` through their public API. The split is by lifecycle stage — types describing source extraction live in `@trapi/metadata`; types describing OpenAPI emission live in `@trapi/swagger`.

| Type | Package | What it describes |
|---|---|---|
| `Metadata` | `@trapi/metadata` | The full metadata document — controllers, methods, parameters, type references. The output of `generateMetadata()`. |
| `MetadataGenerateOptions` | `@trapi/metadata` | Input options for `generateMetadata()` — entry point, preset, tsconfig, cache, strict mode. |
| `Controller`, `Method`, `Parameter` | `@trapi/metadata` | The public, post-orchestrator metadata shapes (mutable drafts have `Draft` suffix and live in the same package). |
| `Preset`, `Registry` | `@trapi/metadata` | Preset declaration and the flattened post-`extends` form. |
| `ControllerHandler`, `MethodHandler`, `ParameterHandler` | `@trapi/metadata` | Handler signatures and the `controller(...)` / `method(...)` / `parameter(...)` builders. |
| `HandlerContext`, `JsDocHandlerContext` | `@trapi/metadata` | What a handler's `apply` callback receives — `argument(i)`, `typeArgument(i)`, `parameterType()`. |
| `DecoratorArgument`, `DecoratorTypeArgument`, `DecoratorSource` | `@trapi/metadata` | The AST-extraction shape handlers consume. |
| `MarkerName`, `NumericKind`, `ParamKind`, `CollectionKind` | `@trapi/metadata` | Const objects + same-name type aliases for closed enumerations. |
| `TsConfig`, `TsCompilerOptions` | `@trapi/metadata` | Wrapper around the typescript compiler-options shape. |
| `readString`, `readNumber`, `readBoolean`, `readStringOrStringArray` | `@trapi/metadata` | Argument readers shared across presets. |
| `setControllerPaths`, `setMethodPath` | `@trapi/metadata` | Path-assignment helpers covering the singular-vs-plural asymmetry. |
| `createHandlerContext`, `literalArg`, `arrayArg`, `objectArg`, `identifierArg`, `unresolvableArg`, `typeArg` | `@trapi/metadata` | Test helpers for unit-testing handlers without spinning up the compiler. |
| `SwaggerGenerateOptions`, `SwaggerGenerateData` | `@trapi/swagger` | Input options for `generateSwagger()` — version, metadata, document data. |
| `SpecV2`, `SpecV3` | `@trapi/swagger` | Output OpenAPI specification shapes (`SpecV3` covers 3.0 / 3.1 / 3.2). |
| `Version` | `@trapi/swagger` | Const + same-name type for the supported OpenAPI versions. Use `typeof Version.V2` (not `` `${Version.V2}` ``) inside template-literal types. |
| `OutputForVersion<V>` | `@trapi/swagger` | Type helper — resolves to `SpecV2` for `V2`, `SpecV3` otherwise. Use it to type wrapper return values that depend on the requested version. |
| `DocumentFormat`, `SecurityType` | `@trapi/swagger` | Const objects for output formats and security scheme kinds. |
| `saveSwagger` | `@trapi/swagger` | Optional file-writer separate from `generateSwagger()`. |

Rule of thumb: if the type describes something *before* the spec exists (source files, decorator handlers, type resolution), it lives in `@trapi/metadata`. If it describes the OpenAPI document itself or how it's emitted, it lives in `@trapi/swagger`.
