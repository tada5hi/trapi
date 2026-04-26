# Custom Presets

A preset is a published npm package whose default export is a v2 `Preset`. Publishing a preset lets you reuse a decorator mapping across projects, and lets other teams adopt your decorator library with a one-line config change.

## Anatomy

```typescript
type Preset = {
    name: string;                          // unique preset name (used by `extends` / `replaces`)
    extends?: string[];                    // other preset package names to inherit from
    controllers?: ControllerHandler[];     // class-target handlers
    methods?: MethodHandler[];             // method-target handlers
    parameters?: ParameterHandler[];       // parameter-target handlers
    controllerJsDoc?: ControllerJsDocHandler[];
    methodJsDoc?: MethodJsDocHandler[];
    parameterJsDoc?: ParameterJsDocHandler[];
};
```

A handler matches a decorator (or JSDoc tag) by name and contributes to a draft:

```typescript
type ControllerHandler = {
    match: { name: string; on?: 'class' };
    apply: (ctx: HandlerContext, draft: ControllerDraft) => void;
    replaces?: true | string;
    marker?: ResolverMarker;
};
```

## Minimal Example

```typescript
// src/index.ts
import {
    type Preset,
    ParamKind,
    controller,
    method,
    parameter,
} from '@trapi/metadata';

const routeControllerHandler = controller({
    match: { name: 'Route', on: 'class' },
    apply: (ctx, draft) => {
        const arg = ctx.argument(0);
        draft.path = arg && arg.kind === 'literal' && typeof arg.raw === 'string'
            ? arg.raw
            : '';
    },
});

const httpGetHandler = method({
    match: { name: 'HttpGet', on: 'method' },
    apply: (_ctx, draft) => { draft.verb = 'get'; },
});

const fromBodyHandler = parameter({
    match: { name: 'FromBody', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Body; },
});

const preset: Preset = {
    name: '@my-org/trapi-preset',
    controllers: [routeControllerHandler],
    methods: [httpGetHandler],
    parameters: [fromBodyHandler],
};

export default preset;
```

`controller(...)`, `method(...)`, `parameter(...)` are identity helpers — they exist to preserve narrow types at declaration sites.

## Extending Another Preset

Use `extends` to inherit handlers from another preset:

```typescript
const preset: Preset = {
    name: '@my-org/trapi-preset',
    extends: ['@trapi/decorators'],
    controllers: [
        // Recognise @Route(...) in addition to inherited @Controller(...)
        routeControllerHandler,
    ],
};
```

By default, all handlers from `extends` parents and your own preset run additively. To shadow a parent handler, set `replaces`:

```typescript
controller({
    match: { name: 'Controller', on: 'class' },
    replaces: true,                   // shadow ALL parent handlers matching the same name
    apply: (ctx, draft) => { /* ... */ },
});
```

`replaces: '<presetName>'` shadows handlers contributed by exactly that parent preset; `replaces: true` shadows every parent's matching handlers. Same-preset siblings are always additive — `replaces` only affects inherited handlers.

## Built-in Helpers

For simple cases, `into()`, `append()`, and `flag()` save boilerplate:

```typescript
import { append, controller, flag, into, method } from '@trapi/metadata';

method({ match: { name: 'Path', on: 'method' }, apply: into('path').positional(0) });
method({ match: { name: 'Tags', on: 'method' }, apply: append('tags').positionalAll() });
controller({ match: { name: 'Hidden', on: 'class' }, apply: flag('hidden') });
```

## Resolver Markers

If your preset renames decorators that the type resolver consumes (`@Hidden`, `@Deprecated`, `@Extension`, `@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble`), tag the handler with a `marker` so the type resolver discovers it:

```typescript
import {
    MarkerName,
    NumericKind,
    controller,
    flag,
    parameter,
} from '@trapi/metadata';

controller({
    match: { name: 'Skip', on: 'class' },
    apply: flag('hidden'),
    marker: MarkerName.Hidden,           // or just 'hidden'
});

parameter({
    match: { name: 'AsInteger', on: 'parameter' },
    apply: (_ctx, draft) => {
        draft.validators.isInt = { value: 'int' };
    },
    marker: { numeric: NumericKind.Int }, // or { numeric: 'int' }
});
```

The marker tells the type resolver "this handler represents the *concept* of hidden/numeric/etc." — preset authors are free to use any decorator name and the resolver still finds it. JSDoc handlers can carry markers too (`marker: 'deprecated'` on a JSDoc handler matching `tag: 'gone'` makes the resolver treat `@gone` as deprecated).

## JSDoc Handlers

JSDoc tags can drive metadata too. Register handlers under `methodJsDoc` / `controllerJsDoc` / `parameterJsDoc`:

```typescript
import { methodJsDoc } from '@trapi/metadata';

const summaryJsDocHandler = methodJsDoc({
    match: { tag: 'summary' },
    apply: (ctx, draft) => {
        if (ctx.source.text) draft.summary = ctx.source.text;
    },
});
```

Decorator handlers run before JSDoc handlers on the same node, so JSDoc acts as an override layer.

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
        "@trapi/metadata": "^2.0.0"
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

The string is resolved by the loader (named export `preset`, then default export) and validated against the v2 `Preset` schema before any handler runs. Misshapen presets fail loud at load time with a path to the offending field.

## Worked Example: typescript-rest

For inspiration, the [`@trapi/preset-typescript-rest`](https://github.com/tada5hi/trapi/tree/master/packages/preset-typescript-rest) source is short and readable. It maps `@Path`, `@GET`, `@POST`, `@QueryParam`, `@FileParam`, etc. to handler functions.

## Testing a Preset

The simplest test harness is to feed `generateMetadata()` a fixture controller that uses your decorators and assert on the resulting metadata:

```typescript
import { generateMetadata } from '@trapi/metadata';
import preset from '../src';

const metadata = await generateMetadata({
    entryPoint: ['test/fixtures/**/*.ts'],
    preset: preset.name,    // resolved via npm; or use absolute path during local dev
});

expect(metadata.controllers).toHaveLength(1);
expect(metadata.controllers[0].path).toBe('/users');
```

For lower-level unit testing, you can call `validatePreset(preset)` to verify the shape, and `loadRegistry(preset, { resolver })` to materialise a `Registry` directly without going through `generateMetadata`.

## Publishing Checklist

- [ ] `name` is unique and matches the package name
- [ ] All decorators your library exports are mapped
- [ ] `marker` is set on handlers for `@Hidden`/`@Deprecated`/`@Extension`/`@IsInt`/etc. if you rename them
- [ ] `@trapi/metadata` is a peer dependency, not a direct dependency
- [ ] Package is ESM (`"type": "module"`)
- [ ] `exports` field points to both the JS bundle and the type declarations
- [ ] The default export is the `Preset` (TRAPI checks named export `preset`, then default export, then the module itself)
- [ ] A fixture test covers a realistic controller

Once published, consider opening a pull request against the TRAPI monorepo to add a link from the documentation — it helps other users find framework support.