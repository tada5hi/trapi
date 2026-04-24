# Configuration

`generateMetadata()` takes a single `MetadataGenerateOptions` object. Only `entryPoint` is required; everything else has sensible defaults.

## Options

```typescript
import type {
    CacheOptions,
    DecoratorConfig,
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
    decorators?: DecoratorConfig[];
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

### decorators

A list of `DecoratorConfig` entries that describe how your decorators map to `DecoratorID` values. See [Decorators & Presets](/guide/metadata-decorators).

### preset

Name of a published preset package. Loaded dynamically via `import()`.

```typescript
preset: '@trapi/decorators'
```

When both `preset` and `decorators` are supplied, the two lists are concatenated — user entries are tried first, then the preset's. Both names will be recognised for the same `DecoratorID`.

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
    preset: '@trapi/decorators',
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
    preset: '@trapi/decorators',
    tsconfig: './tsconfig.build.json',
});
```

### Custom Decorators with a Cache

```typescript
import { DecoratorID } from '@trapi/metadata';

await generateMetadata({
    entryPoint: 'src/api/**/*.ts',
    decorators: [
        { id: DecoratorID.CONTROLLER, name: 'Route' },
        { id: DecoratorID.GET,        name: 'HttpGet' },
        { id: DecoratorID.POST,       name: 'HttpPost' },
        { id: DecoratorID.BODY,       name: 'FromBody' },
    ],
    cache: { enabled: true, directoryPath: '.cache/trapi' },
});
```

## The Output

```typescript
type Metadata = {
    controllers: Controller[];
    referenceTypes: Record<string, ReferenceType>;
};
```

`controllers` is the list of discovered routes, grouped by class. `referenceTypes` is a lookup of all named types referenced anywhere in the metadata — interfaces, classes, enums, refined type aliases — keyed by their canonical name. See the [API Reference](/guide/metadata-api-reference) for the full type shape.
