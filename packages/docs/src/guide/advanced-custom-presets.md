# Custom Presets

A preset is a published npm package whose default export is a `PresetSchema`. Publishing a preset lets you reuse a mapping across projects, and lets other teams adopt your decorator library with a one-line config change.

## Anatomy

```typescript
type PresetSchema = {
    extends: string[];          // other preset package names to inherit from (empty array if none)
    items: DecoratorConfig[];   // this preset's mapping entries
};
```

```typescript
// src/index.ts
import { DecoratorID, type PresetSchema } from '@trapi/metadata';

const schema: PresetSchema = {
    extends: [],
    items: [
        { id: DecoratorID.CONTROLLER, name: 'Route', properties: { value: {} } },
        { id: DecoratorID.GET,        name: 'HttpGet',  properties: { value: {} } },
        { id: DecoratorID.POST,       name: 'HttpPost', properties: { value: {} } },
        { id: DecoratorID.BODY,       name: 'FromBody', properties: { value: {} } },
        { id: DecoratorID.QUERY,      name: 'FromQuery', properties: { value: {} } },
        // ...
    ],
};

export default schema;
```

TRAPI accepts the schema as either the default export or a named `default` member on the module. `extends` must be present — pass `[]` if your preset does not build on another.

### Extending Another Preset

Instead of re-listing every entry, you can extend an existing preset and add your own mappings on top:

```typescript
const schema: PresetSchema = {
    extends: ['@trapi/decorators'],
    items: [
        // Recognise @Route(...) in addition to the inherited @Controller(...)
        { id: DecoratorID.CONTROLLER, name: 'Route', properties: { value: {} } },
    ],
};
```

TRAPI concatenates this preset's `items` first, then the entries loaded from each extended preset. Matches are tried in that order, so your own entries are attempted first — both decorator names remain valid for the same `DecoratorID`. Extension is additive, not override.

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

`properties` is a map keyed by logical property name — the valid keys depend on the `DecoratorID` (see [Property Names by DecoratorID](/guide/metadata-decorators#property-names-by-decoratorid)). Each value says where on the decorator call to read that property from:

```typescript
type DecoratorPropertyConfigInput = Partial<{
    isType: boolean;       // argument carries a type reference
    index: number;         // positional argument index (default: 0)
    amount?: number;       // number of arguments to consume (-1 = all remaining)
    strategy?: 'merge' | ((...items: any[]) => any);
}>;
```

### Positional

```typescript
{
    id: DecoratorID.DESCRIPTION,
    name: 'Response',
    properties: {
        statusCode: { index: 0 },
        description: { index: 1 },
        payload: { index: 2 },
        type: { isType: true },
    },
}
```

### Variadic with Merge

```typescript
{
    id: DecoratorID.ACCEPT,
    name: 'Accept',
    properties: {
        value: { amount: -1, strategy: 'merge' },
    },
}
```

See the [API Reference](/guide/metadata-api-reference#decoratorconfig) for the full property schema and [Decorators & Presets](/guide/metadata-decorators#property-names-by-decoratorid) for the per-`DecoratorID` property name table.

## Worked Example: typescript-rest

For inspiration, the [`@trapi/preset-typescript-rest`](https://github.com/tada5hi/trapi/tree/master/packages/preset-typescript-rest) source is short and readable. It maps `@Path`, `@GET`, `@POST`, `@FormParam`, `@FileParam`, etc. to the corresponding `DecoratorID` values.

## Testing a Preset

The simplest test harness is to feed `generateMetadata()` a fixture controller that uses your decorators and assert on the resulting metadata:

```typescript
import { generateMetadata } from '@trapi/metadata';
import schema from '../src';

const metadata = await generateMetadata({
    entryPoint: ['test/fixtures/**/*.ts'],
    decorators: schema.items,
});

expect(metadata.controllers).toHaveLength(1);
expect(metadata.controllers[0].path).toBe('/users');
```

Using `decorators` directly (rather than `preset`) side-steps the module-resolution lookup during tests.

## Publishing Checklist

- [ ] `schema.extends` is present (pass `[]` if you do not inherit from another preset)
- [ ] All decorators your library exports are mapped
- [ ] `@trapi/metadata` is a peer dependency, not a direct dependency
- [ ] Package is ESM (`"type": "module"`)
- [ ] `exports` field points to both the JS bundle and the type declarations
- [ ] The default export is the schema (TRAPI checks for a plain export and for a `.default` on the module)
- [ ] A fixture test covers a realistic controller

Once published, consider opening a pull request against the TRAPI monorepo to add a link from the documentation — it helps other users find framework support.
