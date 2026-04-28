# Configuration

`generateMetadata()` takes a single `MetadataGenerateOptions` object. Only `entryPoint` is required; everything else has sensible defaults.

## Options

```typescript
import type {
    CacheOptions,
    TsConfig,
} from '@trapi/metadata';

export type EntryPointOptions = {
    cwd: string;
    pattern: string;
};

export type EntryPoint =
    | string
    | string[]
    | EntryPointOptions
    | EntryPointOptions[];

export interface MetadataGenerateOptions {
    entryPoint: EntryPoint;
    ignore?: string[];
    allow?: string[];
    cache?: string | boolean | Partial<CacheOptions>;
    preset?: string;
    tsconfig?: string | TsConfig;
}
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

Name of a published preset package. Loaded dynamically via `import()` and validated against the v2 `Preset` schema before use.

```typescript
preset: '@trapi/preset-decorators-express'
```

`generateMetadata` resolves the package, looks for a named export `preset` (then the default export, then the module itself), validates the shape, and materialises a `Registry` of handlers via `loadRegistry`. `extends` chains in the resolved preset are loaded recursively through the same lookup.

To author your own preset see [Custom Presets](/guide/advanced-custom-presets).

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
