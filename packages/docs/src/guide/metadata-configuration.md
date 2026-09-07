# Configuration

`generateMetadata()` takes a single `MetadataGenerateOptions` object. Only `entryPoint` is required; everything else has sensible defaults.

## Options

```typescript
import type {
    CacheOptions,
    TsConfig,
} from '@trapi/metadata';
import type {
    Preset,
    Registry,
    UnmatchedDecoratorReport,
} from '@trapi/core';

export type EntryPointOptions = {
    cwd: string;
    pattern: string;
};

export type EntryPoint =
    | string
    | string[]
    | EntryPointOptions
    | EntryPointOptions[];

export type MetadataGenerateOptions = {
    entryPoint: EntryPoint;
    ignore?: string[];
    allow?: string[];
    cache?: string | boolean | Partial<CacheOptions>;
    preset?: string | Preset;
    registry?: Registry;
    strict?: boolean | 'throw';
    onUnmatchedDecorator?: (reports: UnmatchedDecoratorReport[]) => void;
    tsconfig?: string | TsConfig;
};
```

### entryPoint

The file(s) to scan. Accepts one or more glob patterns or `{ cwd, pattern }` objects.

```typescript
// Single glob
entryPoint: 'src/controllers/**/*.ts'

// Multiple globs
entryPoint: ['src/controllers/**/*.ts', 'src/routes/**/*.ts']

// With a custom working directory
entryPoint: { cwd: 'packages/api', pattern: 'src/**/*.controller.ts' }
```

### ignore

Directories or glob patterns to exclude. Applied after `entryPoint` has matched.

```typescript
ignore: ['**/node_modules/**', '**/*.spec.ts']
```

### allow

Explicit allowlist. Any file that does not match `allow` is discarded.

```typescript
allow: ['**/*.controller.ts']
```

### cache

Enables the metadata cache so a previous extraction can be reused on subsequent runs. See [Caching](/guide/metadata-caching).

```typescript
cache: true                             // enabled, directory defaults to os.tmpdir()
cache: './.cache/trapi'                 // shorthand for { enabled: true, directoryPath: './.cache/trapi' }
cache: { enabled: true, directoryPath: '.cache/trapi' }  // full options object
```

### preset

Decorator preset to load. Either a published preset name or an inline `Preset` object.

```typescript
preset: '@trapi/preset-decorators-express'         // by name (npm / relative path / `module:` specifier)
preset: { name: 'my-app/preset', controllers: [...] }   // inline (still walked through `loadRegistry`)
```

`generateMetadata` resolves the package, looks for a named export `preset` (then the default export, then the module itself), validates the shape, and materialises a `Registry` of handlers via `loadRegistry`. `extends` chains in the resolved preset are loaded recursively through the same lookup.

To author your own preset see [Custom Presets](/guide/advanced-custom-presets).

### registry

An already-resolved decorator `Registry`. Use this for one-off custom handlers without authoring a full `Preset`.

```typescript
import { createRegistry, method } from '@trapi/core';

registry: createRegistry({
    methods: [
        method({ match: { name: 'Get', on: 'method' }, apply: (_ctx, draft) => { draft.verb = 'get'; } }),
    ],
})
```

If both `preset` and `registry` are provided they merge: the preset-derived registry comes first, the inline `registry` is appended after, so inline handlers run last (winning on scalar mutations like `into('path')`, additively contributing on `append`-style fields). Inline `registry` handlers cannot carry `replaces` semantics — those are enforced at preset-load time.

### strict

Surface decorators that don't match any registered handler — useful for catching typos (`@Hiden` vs `@Hidden`) or unwired decorators in custom presets.

```typescript
strict: true        // emit a single console.warn at the end of generation
strict: 'throw'     // throw GeneratorError instead — useful as a CI gate
```

JSDoc tags are not included in strict-mode reporting (standard documentation tags like `@param`, `@returns`, … would generate excessive noise).

### onUnmatchedDecorator

Replace the default `console.warn` / `throw` behaviour of `strict` with a callback. Setting this implicitly enables collection — you don't also need `strict`.

```typescript
onUnmatchedDecorator: (reports) => {
    for (const r of reports) {
        console.error(`unmatched @${r.name} on ${r.host.name} (${r.file}:${r.line})`);
    }
}
```

### tsconfig

The TypeScript configuration to use when analysing source. Accepts a path to a `tsconfig.json` or an inline `TsConfig` object.

```typescript
// Path
tsconfig: './tsconfig.json'

// Inline
tsconfig: {
    compilerOptions: {
        target: 'ES2022',
        module: 'NodeNext',
        experimentalDecorators: true,
    },
}
```

If omitted, TRAPI uses a permissive default that accepts most projects. For consistent behaviour between your build and metadata generation, point at the same `tsconfig.json` you compile with.

A path is parsed with TypeScript's own config parser, so `extends` chains are followed and `paths` resolve against the `baseUrl` of the config that declares it — a package config inheriting `baseUrl` from a monorepo root behaves the same as it does under `tsc`.

## Typical Configurations

### Minimal

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
});
```

### Multiple Entry Points with a Shared tsconfig

```typescript
await generateMetadata({
    entryPoint: [
        'src/controllers/**/*.ts',
        'src/resources/**/*.controller.ts',
    ],
    ignore: ['**/*.spec.ts', '**/*.test.ts'],
    preset: '@trapi/preset-decorators-express',
    tsconfig: './tsconfig.build.json',
});
```

### Custom Preset with a Cache

For non-standard decorator names, author a v2 `Preset` (see [Custom Presets](/guide/advanced-custom-presets)) and load it by package name:

```typescript
await generateMetadata({
    entryPoint: 'src/api/**/*.ts',
    preset: '@my-org/trapi-preset',
    cache: { enabled: true, directoryPath: '.cache/trapi' },
});
```

During local development you can also pass an absolute or relative path (`./presets/my-preset.ts`) instead of a package name — useful before the preset is published.

## The Output

```typescript
type Metadata = {
    controllers: Controller[];
    referenceTypes: Record<string, ReferenceType>;
};
```

`controllers` is the list of discovered routes, grouped by class. `referenceTypes` is a lookup of all named types referenced anywhere in the metadata — interfaces, classes, enums, refined type aliases — keyed by their canonical name. See the [API Reference](/guide/metadata-api-reference) for the full type shape.
