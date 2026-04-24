# Custom Presets

A preset is a published npm package that exports a TRAPI decorator mapping. Publishing a preset lets you reuse a mapping across projects, and lets other teams adopt your decorator library with a one-line config change.

## Anatomy

A preset package needs exactly two things:

1. An exported `schema` mapping decorator names to `DecoratorID`.
2. A package name the consumer can reference in `preset`.

```typescript
// src/index.ts
import { DecoratorID, type PresetSchema } from '@trapi/metadata';

export const schema: PresetSchema = {
    name: '@my-org/trapi-preset',
    items: [
        { id: DecoratorID.CONTROLLER, name: 'Route' },
        { id: DecoratorID.GET,        name: 'HttpGet' },
        { id: DecoratorID.POST,       name: 'HttpPost' },
        { id: DecoratorID.BODY,       name: 'FromBody' },
        { id: DecoratorID.QUERY,      name: 'FromQuery' },
        // ...
    ],
};
```

The default export must be the schema (or a named `schema` export — TRAPI accepts either).

## Package Setup

```json
{
    "name": "@my-org/trapi-preset",
    "version": "0.1.0",
    "type": "module",
    "main": "./dist/index.mjs",
    "types": "./dist/index.d.mts",
    "exports": {
        ".": {
            "types": "./dist/index.d.mts",
            "import": "./dist/index.mjs"
        }
    },
    "peerDependencies": {
        "@trapi/metadata": "^1.3.0"
    }
}
```

`@trapi/metadata` must be a peer dependency — consumers have it installed already, and you want to use *their* version, not bundle your own.

## Consuming

In the target project:

```bash
npm install --save @my-org/trapi-preset
```

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@my-org/trapi-preset',
});
```

That's it — TRAPI resolves `@my-org/trapi-preset`, imports its `schema`, and uses the `items` list.

## Property Configuration

If your decorators accept arguments that do not map cleanly to TRAPI's defaults (e.g. a custom options object, positional arguments in an unusual order), describe them with `properties`:

```typescript
{
    id: DecoratorID.CONTROLLER,
    name: 'Route',
    properties: [
        { type: 'path', strategy: 'object', key: 'path' },
    ],
}
```

`strategy` can be:

- `'positional'` (default) — read from `properties[index]`
- `'object'` — read from an argument object by `key`
- `'call'` — the decorator is called with a factory function

See the [API Reference](/guide/metadata-api-reference#decoratorconfig) for the full property schema.

## Worked Example: typescript-rest

For inspiration, the [`@trapi/preset-typescript-rest`](https://github.com/tada5hi/trapi/tree/master/packages/preset-typescript-rest) source is short and readable. It maps `@Path`, `@GET`, `@POST`, `@FormParam`, `@FileParam`, etc. to the corresponding `DecoratorID` values.

## Testing a Preset

The simplest test harness is to feed `generateMetadata()` a fixture controller that uses your decorators and assert on the resulting metadata:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { schema } from '../src';

const metadata = await generateMetadata({
    entryPoint: ['test/fixtures/**/*.ts'],
    decorators: schema.items,
});

expect(metadata.controllers).toHaveLength(1);
expect(metadata.controllers[0].path).toBe('/users');
```

Using `decorators` directly (rather than `preset`) side-steps the module-resolution lookup during tests.

## Publishing Checklist

- [ ] `schema.name` matches the package name (useful for diagnostics)
- [ ] All decorators your library exports are mapped
- [ ] `@trapi/metadata` is a peer dependency, not a direct dependency
- [ ] Package is ESM (`"type": "module"`)
- [ ] `exports` field points to both the JS bundle and the type declarations
- [ ] A fixture test covers a realistic controller

Once published, consider opening a pull request against the TRAPI monorepo to add a link from the documentation — it helps other users find framework support.
