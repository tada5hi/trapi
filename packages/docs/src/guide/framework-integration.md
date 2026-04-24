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
        { id: DecoratorID.CONTROLLER, name: 'Route',     properties: { value: {} } },
        { id: DecoratorID.GET,        name: 'HttpGet' },
        { id: DecoratorID.POST,       name: 'HttpPost' },
        { id: DecoratorID.BODY,       name: 'FromBody',  properties: { value: {} } },
        { id: DecoratorID.QUERY,      name: 'FromQuery', properties: { value: {} } },
        // ...
    ],
});
```

Decorators that carry a value (route paths, parameter names, content types) need `properties: { value: {} }` so TRAPI knows to read the first argument. HTTP verb decorators can be declared with just `id` and `name` — they default to reading the path from argument `0`.

If you intend to reuse the mapping across multiple projects, publish it as a [Custom Preset](/guide/advanced-custom-presets).

## Combining a Preset with Extra Mappings

You can load a preset and add your own mappings via `decorators`:

```typescript
await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/decorators',
    decorators: [
        // Recognise @Route(...) in addition to the preset's @Controller(...)
        { id: DecoratorID.CONTROLLER, name: 'Route', properties: { value: {} } },
    ],
});
```

The lists are concatenated, with `decorators` entries tried first — both decorator names end up valid. If you need to *replace* a preset entry, supply only `decorators` (no `preset`) with your complete mapping.

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
