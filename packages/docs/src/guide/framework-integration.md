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

Both framework presets above already extend `@trapi/decorators`, so decorators like `@Hidden`, `@Tags`, `@Description`, `@IsInt`, `@Extension`, and `@Security` are available out of the box. You only need to install it explicitly if you want to import the runtime stubs in your code:

```bash
npm install --save @trapi/decorators
```

```typescript
import { Hidden, Tags } from '@trapi/decorators';
```

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
    extends: ['@trapi/decorators'],
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
