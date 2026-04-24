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

### @trapi/decorators (reference set)

If you are starting fresh and do not need a specific framework's decorators, use the reference set that TRAPI ships:

```bash
npm install --save @trapi/decorators
```

```typescript
await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/decorators',
});
```

## Using a Custom Decorator Set

If your framework is not on the list (or you have home-grown decorators), describe the mapping inline:

```typescript
import { DecoratorID, generateMetadata } from '@trapi/metadata';

await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    decorators: [
        { id: DecoratorID.CONTROLLER, name: 'Route' },
        { id: DecoratorID.GET,        name: 'HttpGet' },
        { id: DecoratorID.POST,       name: 'HttpPost' },
        { id: DecoratorID.BODY,       name: 'FromBody' },
        { id: DecoratorID.QUERY,      name: 'FromQuery' },
        // ...
    ],
});
```

If you intend to reuse the mapping across multiple projects, publish it as a [Custom Preset](/guide/advanced-custom-presets).

## Combining a Preset with Overrides

You can load a preset and override specific mappings by also passing `decorators`:

```typescript
await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/decorators',
    decorators: [
        // override only the controller decorator; keep everything else from the preset
        { id: DecoratorID.CONTROLLER, name: 'Route' },
    ],
});
```

Entries in `decorators` take precedence over the preset.

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
