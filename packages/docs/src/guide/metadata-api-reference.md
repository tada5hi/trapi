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
interface Controller {
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
}
```

### `Method`

```typescript
type MethodType = 'get' | 'post' | 'put' | 'delete' | 'options' | 'head' | 'patch';

interface Method {
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
}
```

### `Parameter`

```typescript
interface Parameter {
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
}
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

### `CacheOptions`

```typescript
interface CacheOptions {
    enabled: boolean;          // default: true when cache is explicitly configured
    directoryPath: string;     // default: os.tmpdir()
    fileName?: string;         // default: metadata-{hash}.json
    clearAtRandom: boolean;    // prune stale entries ~10% of the time; default: true outside of NODE_ENV=test
}

type CacheOptionsInput = Partial<CacheOptions>;
```

Accepted inputs to `MetadataGenerateOptions.cache`:

- `true` → `{ enabled: true }`
- `false` → cache disabled
- `string` → `{ enabled: true, directoryPath: string }`
- `Partial<CacheOptions>` → merged onto the defaults

### `DecoratorConfig`

```typescript
type DecoratorConfig<T extends `${DecoratorID}` = `${DecoratorID}`> = {
    id: T;
    name: string;
    properties?: {
        [propertyName: string]: DecoratorPropertyConfigInput;
    };
};

type DecoratorPropertyConfigInput = Partial<DecoratorPropertyConfig>;

type DecoratorPropertyConfig = {
    isType: boolean;           // default: false — true when the argument carries a type reference
    index: number;             // default: 0 — positional argument to read from
    amount?: number;           // how many arguments to consume (-1 = all remaining)
    strategy?: DecoratorPropertyStrategy;
};

type DecoratorPropertyStrategy = 'merge' | ((...items: any[]) => any);
```

`properties` is a map keyed by logical property name. Valid keys depend on the `DecoratorID` — see [Property Names by DecoratorID](/guide/metadata-decorators#property-names-by-decoratorid).

### `PresetSchema`

```typescript
type PresetSchema = {
    extends: string[];         // other preset package names to inherit from
    items: DecoratorConfig[];
};
```

### `TsConfig`

```typescript
type TsCompilerOptions = CompilerOptions;  // re-exported from 'typescript'

type TsConfig = {
    compilerOptions?: TsCompilerOptions;
    [key: string]: any;        // standard tsconfig fields like include, exclude, files, references
};
```

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

The names above are the **documented public contract**. Breaking changes to anything listed here will bump the major version.

`@trapi/metadata` also re-exports internals from the root entry — implementation classes (`MetadataGenerator`, `TypeNodeResolver`, `DecoratorResolver`), low-level helpers (`hasOwnProperty`, `normalizePath`, `isStringArray`), and port interfaces (`IMetadataGenerator`, `IControllerGenerator`, `IParameterGenerator`, …). These are available for advanced extension scenarios (custom resolvers, alternative generators, adapter implementations), but they are not documented here as part of the stable surface and may change between minor versions. Pin a specific version if you rely on them.
