# @trapi/metadata — API Reference

Every name in this reference is part of the stable public surface. Anything not documented here should be treated as internal even if it is re-exported.

## Functions

### `generateMetadata(options)`

```typescript
async function generateMetadata(
    options: MetadataGenerateOptions,
): Promise<Metadata>;
```

Extracts API metadata from TypeScript source using the preset configured in `options.preset`. Returns a normalised representation of every discovered controller, method, parameter, and referenced type.

See [Configuration](/guide/metadata-configuration) for field-by-field notes on `MetadataGenerateOptions`.

### `loadRegistry(preset, options)`

```typescript
async function loadRegistry(
    preset: Preset,
    options: LoadRegistryOptions,
): Promise<Registry>;
```

Resolves a preset's `extends` chain through the supplied resolver and applies `replaces` semantics, returning a flat `Registry` ready for the orchestrator. `LoadRegistryOptions` is `{ resolver: PresetResolver; strict?: boolean }`. With `strict: true`, a `replaces` entry that doesn't match any parent throws.

### `loadRegistryByName(name)`

```typescript
async function loadRegistryByName(name: string): Promise<Registry>;
```

Resolves a preset by package name (or relative path / `module:` URI) and immediately materialises its registry through the same resolver used internally by `generateMetadata`.

### `resolvePresetByName(name)`

```typescript
async function resolvePresetByName(name: string): Promise<Preset>;
```

Loads a preset module by string identifier. Looks for a `preset` named export, then the default export, then the module itself.

### `applyDecoratorHandlers(node, handlers, draft, options)` / `applyJsDocHandlers(...)`

Low-level orchestrator entry points. Most consumers won't use these directly — `generateMetadata` runs them internally on every controller / method / parameter node. They are exported for advanced extension scenarios (custom generators, fixture-driven tests).

## Types

### `MetadataGenerateOptions`

```typescript
type MetadataGenerateOptions = MetadataGeneratorOptions & {
    tsconfig?: string | TsConfig;
};

type MetadataGeneratorOptions = {
    entryPoint: EntryPoint;
    ignore?: string[];
    allow?: string[];
    cache?: string | boolean | Partial<CacheOptions>;
    preset?: string;
    strict?: boolean | 'throw';
    onUnmatchedDecorator?: (reports: UnmatchedDecoratorReport[]) => void;
};
```

`strict: true` warns via `console.warn` on decorators that don't match any registered handler (e.g. typos like `@Hiden`); `strict: 'throw'` raises a `GeneratorError` instead. `onUnmatchedDecorator` short-circuits both — the callback receives every report and decides what to do.

### `EntryPoint` / `EntryPointOptions`

```typescript
type EntryPointOptions = {
    cwd: string;
    pattern: string;
};

type EntryPoint =
    | string
    | string[]
    | EntryPointOptions
    | EntryPointOptions[];
```

### `Metadata`

```typescript
type Metadata = {
    controllers: Controller[];
    referenceTypes: Record<string, ReferenceType>;
};
```

### `Controller`

```typescript
type Controller = {
    name: string;
    path: string;                 // relative URL path, e.g. '/users'
    location: string;             // source file path
    methods: Method[];
    responses: Response[];
    tags: string[];
    consumes: string[];           // default Content-Types accepted
    produces: string[];           // default Content-Types produced
    hidden: boolean;              // excluded from emitted specs when true
    security?: Security[];
    extensions: Extension[];
};
```

### `Method`

```typescript
type MethodType = 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch';

type Method = {
    method: MethodType;
    name: string;
    path: string;
    description: string;
    parameters: Parameter[];
    responses: Response[];
    type: BaseType;               // resolved return type
    tags: string[];
    consumes: string[];
    produces: string[];
    extensions: Extension[];      // x-* extensions
    hidden: boolean;
    operationId?: string;
    summary?: string;
    deprecated?: boolean;
    security?: Security[];
};
```

### `Parameter`

```typescript
type Parameter = {
    parameterName: string;        // argument name in source
    name: string;                 // public name (may differ, e.g. from a decorator arg)
    description: string;
    in: `${ParameterSource}`;     // 'body' | 'bodyProp' | 'context' | 'cookie' | 'header'
                                  // | 'formData' | 'query' | 'queryProp' | 'path'
    type: Type;
    required: boolean;
    default?: any;
    deprecated?: boolean;
    collectionFormat?: `${CollectionFormat}`;  // 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi'
    allowEmptyValue?: boolean;
    minItems?: number;
    maxItems?: number;
    examples?: Example[];
    exampleLabels?: string[];
    validators?: Record<string, Validator>;
};
```

### `Type`

The `Type` union covers every shape the resolver produces:

- `StringType`, `BooleanType`, `BigintType`
- `IntegerType`, `LongType`, `FloatType`, `DoubleType` (TypeScript `number` resolves to `DoubleType` by default; `@IsInt` / `@IsLong` / `@IsFloat` / `@IsDouble` refine it)
- `DateType`, `DateTimeType`, `BufferType`, `ByteType`, `BinaryType`, `FileType`
- `VoidType`, `UndefinedType`, `NeverType`, `AnyType`
- `ArrayType`, `TupleType`
- `ObjectType`, `NestedObjectLiteralType`, `EnumType`
- `UnionType`, `IntersectionType`
- `RefObjectType`, `RefEnumType`, `RefAliasType` — named references, each has a `refName: string`

`PrimitiveType` is a convenience alias spanning the non-reference primitives. Every variant carries a `typeName: ${TypeName}` discriminator.

See [Supported TypeScript Types](/guide/advanced-type-support) for behavioural detail.

### `Validator`

```typescript
type Validator = {
    value?: unknown;
    message?: string;
    meta?: ValidatorMeta;
};

interface ValidatorMeta {}
```

`ValidatorMeta` is an empty interface that consumers extend via TypeScript declaration merging from their own package, e.g. `@trapi/swagger` augments it with an `openApi` field (see the [swagger API reference](/guide/swagger-api-reference)). The metadata layer never inspects `meta`; it carries opaque hints from preset handlers to downstream consumers. Third-party preset authors extending the type from their own package follow the same pattern.

### `CacheOptions`

```typescript
type CacheOptions = {
    enabled: boolean;          // default: true when cache is explicitly configured
    directoryPath: string;     // default: os.tmpdir()
    fileName?: string;         // default: metadata-{hash}.json
    clearAtRandom: boolean;    // prune stale entries ~10% of the time; default: true outside of NODE_ENV=test
};

type CacheOptionsInput = Partial<CacheOptions>;
```

Accepted inputs to `MetadataGenerateOptions.cache`:

- `true` → `{ enabled: true }`
- `false` → cache disabled
- `string` → `{ enabled: true, directoryPath: string }`
- `Partial<CacheOptions>` → merged onto the defaults

### Decorator system (v2)

```typescript
type Preset = {
    name: string;
    extends?: string[];
    controllers?: ControllerHandler[];
    methods?: MethodHandler[];
    parameters?: ParameterHandler[];
    controllerJsDoc?: ControllerJsDocHandler[];
    methodJsDoc?: MethodJsDocHandler[];
    parameterJsDoc?: ParameterJsDocHandler[];
};

type Match = { name: string; on?: 'class' | 'method' | 'parameter' };
type JsDocMatch = { tag: string; on?: 'class' | 'method' | 'parameter' };

type HandlerContext = {
    host: { name: string; parentName?: string };
    argument: (i: number) => DecoratorArgument | undefined;
    arguments: () => DecoratorArgument[];
    typeArgument: (i: number) => DecoratorTypeArgument | undefined;
    typeArguments: () => DecoratorTypeArgument[];
    parameterType: () => Type | undefined;
};

type ControllerHandler = {
    match: Match;
    apply: (ctx: HandlerContext, draft: ControllerDraft) => void;
    replaces?: true | string;
    marker?: ResolverMarker;
};

// MethodHandler / ParameterHandler / *JsDocHandler follow the same shape with
// kind-specific drafts and contexts.

type ResolverMarker =
    | 'hidden' | 'deprecated' | 'extension'
    | { numeric: 'int' | 'long' | 'float' | 'double' };

type Registry = {
    controllers: ControllerHandler[];
    methods: MethodHandler[];
    parameters: ParameterHandler[];
    controllerJsDoc: ControllerJsDocHandler[];
    methodJsDoc: MethodJsDocHandler[];
    parameterJsDoc: ParameterJsDocHandler[];
};
```

See [Decorators & Presets](/guide/metadata-decorators) for the full handler API and [Custom Presets](/guide/advanced-custom-presets) for authoring guidance.

### `TsConfig`

```typescript
type TsCompilerOptions = CompilerOptions;  // re-exported from 'typescript'

type TsConfig = {
    compilerOptions?: TsCompilerOptions;
    [key: string]: any;        // standard tsconfig fields like include, exclude, files, references
};
```

## Constants

### `ParamKind`, `MarkerName`, `NumericKind`, `DecoratorTargetKind`, `CollectionKind`

`as const` objects paired with same-name type aliases (e.g. `type ParamKind = typeof ParamKind[keyof typeof ParamKind]`) — pass either the const reference (e.g. `ParamKind.Body`) or the bare string (`'body'`). Both type-check.

```typescript
const ParamKind = {
    Body: 'body', BodyProp: 'bodyProp',
    Query: 'query', QueryProp: 'queryProp',
    Path: 'path', Cookie: 'cookie', Header: 'header',
    FormData: 'formData', Context: 'context',
} as const;

const MarkerName = {
    Hidden: 'hidden', Deprecated: 'deprecated', Extension: 'extension',
} as const;

const NumericKind = {
    Int: 'int', Long: 'long', Float: 'float', Double: 'double',
} as const;
```

### `TypeName`

Discriminator for the `Type` union:

```typescript
enum TypeName {
    String   = 'string',
    Number   = 'number',
    Boolean  = 'boolean',
    Bigint   = 'bigint',
    Array    = 'array',
    Tuple    = 'tuple',
    Object   = 'object',
    Enum     = 'enum',
    Union    = 'union',
    Intersection = 'intersection',
    // ... plus the specialised variants
}
```

## Errors

All errors are subclasses of `MetadataError`:

- `MetadataError` — base
- `GeneratorError` — raised while generating metadata (invalid decorator usage, etc.)
- `ResolverError` — raised while resolving a TypeScript type
- `ConfigError` — raised for invalid configuration (codes: `TSCONFIG_MALFORMED`, `PRESET_NOT_FOUND`, `PRESET_MISSING`)
- `ParameterError` — raised for invalid parameter decorators
- `ValidatorError` — raised for validator decorator misuse

Each carries a `code` property for programmatic handling. Use the corresponding `isFooError()` type guard to narrow:

```typescript
import { isResolverError } from '@trapi/metadata';

try {
    await generateMetadata({ ... });
} catch (error) {
    if (isResolverError(error)) {
        console.error('Resolver failed at', error.location);
    }
    throw error;
}
```

## Type Guards

Every `Type` variant has a guard: `isStringType`, `isArrayType`, `isObjectType`, `isRefObjectType`, and so on. They narrow `Type` to the specific variant.

```typescript
import { isRefObjectType } from '@trapi/metadata';

if (isRefObjectType(parameter.type)) {
    const schemaName = parameter.type.refName;
}
```

## Helpers

### `into(key)` / `append(key)` / `flag(key)`

Save boilerplate when a handler just copies one argument into a draft field:

```typescript
import { append, controller, flag, into, method } from '@trapi/metadata';

method({ match: { name: 'Path', on: 'method' }, apply: into('path').positional(0) });
method({ match: { name: 'Tags', on: 'method' }, apply: append('tags').positionalAll() });
controller({ match: { name: 'Hidden', on: 'class' }, apply: flag('hidden') });
```

### `controller` / `method` / `parameter` / `controllerJsDoc` / `methodJsDoc` / `parameterJsDoc`

Identity helpers — pass the handler shape, get the same handler back. Their job is to preserve narrow types at the declaration site.

### `namesForMarker(registry, predicate)` / `tagsForMarker(registry, predicate)`

Enumerate decorator/JSDoc names whose `marker` matches the predicate. Used by the type resolver (and available to anyone authoring marker-aware tooling).

## Stability

The names above are the **documented public contract**. Breaking changes to anything listed here will bump the major version.

`@trapi/metadata` also re-exports internals from the root entry — implementation classes (`MetadataGenerator`, `TypeNodeResolver`), low-level helpers (`hasOwnProperty`, `normalizePath`, `isStringArray`), and port interfaces (`IMetadataGenerator`, `IControllerGenerator`, `IParameterGenerator`, …). These are available for advanced extension scenarios (custom resolvers, alternative generators, adapter implementations), but they are not documented here as part of the stable surface and may change between minor versions. Pin a specific version if you rely on them.
