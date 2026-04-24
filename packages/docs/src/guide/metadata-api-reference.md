# @trapi/metadata — API Reference

Every name in this reference is part of the stable public surface. Anything not documented here should be treated as internal even if it is re-exported.

## Functions

### `generateMetadata(options)`

```typescript
async function generateMetadata(
    options: MetadataGenerateOptions,
): Promise<Metadata>;
```

Extracts API metadata from TypeScript source using the decorator configuration provided. Returns a normalised representation of every discovered controller, method, parameter, and referenced type.

See [Configuration](/guide/metadata-configuration) for field-by-field notes on `MetadataGenerateOptions`.

## Types

### `MetadataGenerateOptions`

```typescript
type MetadataGenerateOptions = MetadataGeneratorOptions & {
    tsconfig?: string | TsConfig;
};

interface MetadataGeneratorOptions {
    entryPoint: EntryPoint;
    ignore?: string[];
    allow?: string[];
    cache?: string | boolean | Partial<CacheOptions>;
    decorators?: DecoratorConfig[];
    preset?: string;
}
```

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
    path: string;
    name: string;
    methods: Method[];
    consumes?: string[];
    produces?: string[];
    tags?: string[];
    security?: Security[];
    // ...
};
```

### `Method`

```typescript
type Method = {
    method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head';
    name: string;
    path: string;
    parameters: Parameter[];
    responses: Response[];
    description?: string;
    deprecated?: boolean;
    hidden?: boolean;
    // ...
};
```

### `Parameter`

```typescript
type Parameter = {
    name: string;
    in: 'path' | 'query' | 'body' | 'formData' | 'header' | 'cookie';
    type: Type;
    required: boolean;
    description?: string;
    // ...
};
```

### `Type`

The `Type` union covers every shape the resolver produces:

- `StringType`, `NumberType`, `BooleanType`, `BigintType`
- `DateType`, `DateTimeType`, `BufferType`, `ByteType`, `BinaryType`
- `VoidType`, `UndefinedType`, `NeverType`, `AnyType`
- `ArrayType`, `TupleType`
- `ObjectType`, `NestedObjectLiteralType`, `EnumType`
- `UnionType`, `IntersectionType`
- `RefObjectType`, `RefEnumType`, `RefAliasType` (named references)

See [Supported TypeScript Types](/guide/advanced-type-support) for behavioural detail.

### `CacheOptions`

```typescript
type CacheOptions = {
    directory: string;
    clearAtRandom?: boolean;
};
```

### `DecoratorConfig`

```typescript
type DecoratorConfig = {
    id: `${DecoratorID}`;
    name: string;
    properties?: DecoratorPropertyConfig[];
};

type DecoratorPropertyConfig = {
    type: string;                   // logical property name
    index?: number;                 // argument index (positional)
    strategy?: 'positional' | 'object' | 'call';
    key?: string;                   // object key when strategy is 'object'
    amount?: number;                // number of arguments consumed
    isType?: boolean;               // argument carries a type reference
};
```

### `PresetSchema`

```typescript
type PresetSchema = {
    name: string;
    items: DecoratorConfig[];
};
```

### `TsConfig`

Subset of the TypeScript compiler options TRAPI reads:

```typescript
type TsConfig = {
    compilerOptions?: CompilerOptions;
    include?: string[];
    exclude?: string[];
};
```

Where `CompilerOptions` is re-exported from `typescript`.

## Enums

### `DecoratorID`

Semantic identifiers for supported decorators. See [Decorators & Presets](/guide/metadata-decorators#decoratorid) for the full table.

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
- `ConfigError` — raised for invalid configuration
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

## Stability

The names above form the stable public contract. Internal classes (`MetadataGenerator`, `TypeNodeResolver`, `DecoratorResolver`) and helpers (`hasOwnProperty`, `normalizePath`) are currently exported for historical reasons but may be hidden in a future major version — rely on the documented surface above.
