# Migrating from 1.x to 2.0

TRAPI 2.0 replaces the 1.x decorator configuration system (`DecoratorConfig[]` + `DecoratorID` enum) with a v2 **preset** system: declarative handlers that mutate drafts, with explicit support for marker-based discovery, `extends` / `replaces`, and JSDoc tag handlers.

If your application only consumes the high-level entry points and the bundled preset (`@trapi/decorators`), the migration is small. If you author **custom decorator mappings** or reach into 1.x internals (`DecoratorResolver`, `DecoratorConfig`, ...), there are concrete code changes to make.

## At a glance

| Area | 1.x | 2.0 |
| --- | --- | --- |
| Inline decorator mapping | `decorators: DecoratorConfig[]` on `MetadataGenerateOptions` | Removed — author a `Preset` and pass `preset` |
| Preset shape | `PresetSchema = { extends, items: DecoratorConfig[] }` | `Preset = { name, controllers, methods, parameters, controllerJsDoc, methodJsDoc, parameterJsDoc, extends? }` |
| Decorator identity | `DecoratorID` enum (`DecoratorID.CONTROLLER`, `DecoratorID.GET`, ...) | Removed — handlers match by `name` string with optional `on` target filter |
| Argument mapping | `properties: { value: { index: 0 } }` config | `apply(ctx, draft)` — read via `ctx.argument(i)` |
| Resolver-side concepts | Hardcoded names in the resolver | `marker: ResolverMarker` on each handler |
| Default export of `@trapi/decorators` | `PresetSchema` | `Preset` |
| `Version.V3` | `openapi: '3.1.0'` | `openapi: '3.0.0'` (use `Version.V3_1` for the 3.1.0 default) |
| File output from `generateSwagger()` | `output: false` / `outputDirectory` / `yaml` options | Removed — call `saveSwagger(spec, ...)` separately |

## What you may need to change

### 1. The `decorators` option is gone

```typescript
// 1.x
import { DecoratorID, generateMetadata } from '@trapi/metadata';

await generateMetadata({
    entryPoint: 'src/**/*.ts',
    decorators: [
        { id: DecoratorID.CONTROLLER, name: 'Route', properties: { value: {} } },
        { id: DecoratorID.GET,        name: 'HttpGet' },
    ],
});
```

In 2.0, custom mappings are authored as a `Preset` and passed through `preset`. For inline use, you can resolve a local module that exports a `Preset`:

```typescript
// 2.0 — author a preset module
// my-preset.ts
import { type Preset, controller, method } from '@trapi/metadata';

const preset: Preset = {
    name: 'my-app/preset',
    controllers: [
        controller({
            match: { name: 'Route', on: 'class' },
            apply: (ctx, draft) => {
                const arg = ctx.argument(0);
                draft.path = arg && arg.kind === 'literal' && typeof arg.raw === 'string'
                    ? arg.raw
                    : '';
            },
        }),
    ],
    methods: [
        method({
            match: { name: 'HttpGet', on: 'method' },
            apply: (ctx, draft) => {
                draft.verb = 'get';
                const path = ctx.argument(0);
                if (path?.kind === 'literal' && typeof path.raw === 'string') {
                    draft.path = path.raw;
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
    entryPoint: 'src/**/*.ts',
    preset: './my-preset.ts',     // relative path resolves to the local module
});
```

If you only need to *extend* the canonical preset, declare it via `extends`:

```typescript
const preset: Preset = {
    name: 'my-app/preset',
    extends: ['@trapi/decorators'],
    controllers: [
        controller({
            match: { name: 'Route', on: 'class' },
            apply: (_ctx, draft) => { draft.path = ''; },
        }),
    ],
};
```

### 2. The `DecoratorID` enum is gone

If you imported `DecoratorID` (e.g. `DecoratorID.CONTROLLER`, `DecoratorID.GET`, ...) — these are removed. Handlers in 2.0 match by `name` string and an optional `on: 'class' | 'method' | 'parameter'` target.

```typescript
// 1.x
{ id: DecoratorID.QUERY, name: 'Query', properties: { value: {} } }

// 2.0
parameter({
    match: { name: 'Query', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = ctx.argument(0);
        if (name?.kind === 'literal' && typeof name.raw === 'string') {
            draft.in = ParamKind.QueryProp;
            draft.name = name.raw;
        } else {
            draft.in = ParamKind.Query;
        }
    },
})
```

### 3. Resolver-side concepts use `marker`

In 1.x the resolver looked for `@Hidden`, `@IsInt`, `@Extension(...)` by hardcoded name. In 2.0 the resolver discovers them via the handler's `marker` field — preset authors can rename a decorator without breaking resolver behaviour.

```typescript
controller({
    match: { name: 'Skip', on: 'class' },     // renamed @Skip instead of @Hidden
    apply: flag('hidden'),
    marker: MarkerName.Hidden,                // resolver still treats @Skip as the hidden concept
});

parameter({
    match: { name: 'AsInteger', on: 'parameter' },
    apply: (_ctx, draft) => {
        draft.validators.isInt = { value: 'int' };
    },
    marker: { numeric: NumericKind.Int },
});
```

Markers: `'hidden' | 'deprecated' | 'extension' | { numeric: 'int' | 'long' | 'float' | 'double' }`. JSDoc handlers can carry markers too — see [Custom Presets — Resolver Markers](/guide/advanced-custom-presets#resolver-markers).

### 4. Default export of `@trapi/decorators`

```typescript
// 1.x — the default export was a PresetSchema
import preset from '@trapi/decorators';
// preset.items: DecoratorConfig[]

// 2.0 — the default export is a v2 Preset
import preset from '@trapi/decorators';
// preset.controllers, preset.methods, preset.parameters, ...
```

If you previously read `preset.items` to enumerate or modify entries, that field no longer exists. Use the kind-specific arrays instead.

### 5. Removed types and runtime symbols

| Removed | Replacement |
| --- | --- |
| `DecoratorID` enum | Match by `name` string |
| `DecoratorConfig` type | Author handlers (`controller(...)`, `method(...)`, `parameter(...)`) |
| `DecoratorPropertyConfig` / `DecoratorPropertyConfigInput` | Read inside `apply` via `ctx.argument(i)` / `ctx.typeArgument(i)` |
| `DecoratorResolver` class | `loadRegistryByName(...)` + the orchestrator |
| `DecoratorPropertyManager` | n/a — drafts are mutated directly |
| `PresetSchema` type | `Preset` |
| `decorators?: DecoratorConfig[]` on `MetadataGenerateOptions` | Removed; use `preset` |

### 6. `Version.V3` now emits OpenAPI 3.0.0

`@trapi/swagger` 1.x defaulted `Version.V3` to OpenAPI 3.1.0. In 2.0, `Version.V3` emits 3.0.0 — use `Version.V3_1` if you need the 1.x default.

```typescript
// 1.x
generate({ version: Version.V3, ... });   // produced openapi: '3.1.0'

// 2.0 — same OpenAPI version requires V3_1
generateSwagger({ version: Version.V3_1, ... });
```

### 7. File writing is no longer baked into spec generation

```typescript
// 1.x
await generate({
    version: Version.V3,
    options: { ... },
    output: './docs/openapi.json',
    outputDirectory: './docs',
    yaml: false,
});

// 2.0
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const spec = await generateSwagger({ version: Version.V3, metadata: { ... } });
await saveSwagger(spec, { cwd: './docs', name: 'openapi', format: 'json' });
```

`generateSwagger()` no longer accepts `output` / `outputDirectory` / `yaml`. Call `saveSwagger(spec, options)` if you want a file on disk.

### 8. New: strict-mode warnings (opt-in)

`generateMetadata({ strict: true })` warns about decorators that don't match any registered handler. Useful for catching typos (`@Hiden` instead of `@Hidden`) or unwired decorators in custom presets. Output goes to `console.warn` once at the end of generation.

### 9. New: loud failure on missing preset

If you call `generateMetadata({ entryPoint })` without a `preset` and source files were scanned, generation now throws `ConfigError(code = PRESET_MISSING)` instead of silently returning an empty controller list. Most 1.x users pass `preset` already, but if you relied on the `decorators` option this is the signal to migrate.

## Migration checklist

- [ ] Replace any `DecoratorID` / `DecoratorConfig` imports — neither symbol exists in 2.0.
- [ ] Replace inline `decorators: [...]` with a `Preset` and `preset: '...'`.
- [ ] If you renamed `@Hidden` / `@Deprecated` / `@Extension` / `@IsInt` etc. — add `marker:` on those handlers.
- [ ] If you used `Version.V3` and emitted `openapi: '3.1.0'`, switch to `Version.V3_1`.
- [ ] If you relied on `output` / `outputDirectory` / `yaml` from `generate()`, replace with a separate `saveSwagger()` call.
- [ ] If you imported the default of `@trapi/decorators` and read `.items`, switch to `.controllers` / `.methods` / `.parameters` etc.
- [ ] Run `generateMetadata` against your project — controllers should be discovered identically. If not, `strict: true` will surface unmatched decorators.

## See also

- [Custom Presets](/guide/advanced-custom-presets) — full reference for authoring a v2 preset
- [Decorators & Presets](/guide/metadata-decorators) — handler API, drafts, `into` / `append` / `flag` helpers
- [Configuration](/guide/metadata-configuration) — current `MetadataGenerateOptions` surface
- [examples/custom-preset](https://github.com/tada5hi/trapi/tree/master/examples/custom-preset) — runnable worked example of a v2 `Preset` for a custom decorator library
