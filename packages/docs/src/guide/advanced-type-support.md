# Supported TypeScript Types

TRAPI resolves TypeScript types through the compiler's own type checker, so the supported set tracks what the compiler itself understands. This page catalogues what is modelled, with notes on how each maps to OpenAPI output.

## Primitives

| TypeScript | Metadata | OpenAPI |
| --- | --- | --- |
| `string` | `StringType` | `type: string` |
| `number` | `NumberType` / refinement | `type: number` |
| `boolean` | `BooleanType` | `type: boolean` |
| `bigint` | `BigintType` | `type: integer`, `format: int64` |
| `void` | `VoidType` | Omitted response content |
| `undefined` | `UndefinedType` | Nullable marker |
| `null` | — | Nullable marker |
| `never` | `NeverType` | No schema emitted (since 1.3) |
| `any` | `AnyType` | No schema constraint |

### Numeric Refinements

The `@IsInt`, `@IsLong`, `@IsFloat`, `@IsDouble` decorators refine a `number` into a more specific schema:

| Decorator | `type` | `format` |
| --- | --- | --- |
| `@IsInt()` | `integer` | `int32` |
| `@IsLong()` | `integer` | `int64` |
| `@IsFloat()` | `number` | `float` |
| `@IsDouble()` | `number` | `double` |

### Date & Binary

| TypeScript | Metadata | OpenAPI |
| --- | --- | --- |
| `Date` | `DateTimeType` | `type: string`, `format: date-time` |
| custom date-only type | `DateType` | `type: string`, `format: date` |
| `Buffer` | `BufferType` | `type: string`, `format: binary` |
| custom `byte` / `binary` types | `ByteType` / `BinaryType` | `type: string`, `format: byte` / `binary` |

## Object Types

### Interfaces and Classes

Property enumeration walks inheritance, including classes declared in sibling files:

```typescript
class Base {
    id: string;
}

class User extends Base {
    name: string;
}
// -> User has { id: string, name: string }
```

### Index Signatures

Modelled as `additionalProperties` on the emitted schema.

```typescript
type Dictionary = { [key: string]: string };
// OpenAPI: { type: 'object', additionalProperties: { type: 'string' } }
```

### Optional Properties

```typescript
type User = { name: string; email?: string };
// required: ['name']
```

## Composite Types

### Unions

```typescript
type Status = 'active' | 'inactive' | 'banned';
// OpenAPI v3: { type: 'string', enum: ['active', 'inactive', 'banned'] }
```

Mixed unions (e.g. `string | number`) emit an `oneOf` schema.

### Intersections

```typescript
type Admin = User & { permissions: string[] };
```

- **V2 emitter:** properties are flattened into a single object schema.
- **V3 emitter:** emitted as `allOf` composing each member.

### Tuples

```typescript
type Pair = [name: string, value: number];
```

The metadata models this as a `TupleType` with named elements. OpenAPI has no direct tuple primitive, so the emitter degrades to `array` with `anyOf` items. Consumers that need the faithful tuple representation can read it from the metadata directly.

## Utility Types

Fully resolved by the compiler:

- `Partial<T>` — all properties optional
- `Required<T>` — all properties required
- `Readonly<T>` — modifier only; structurally identical
- `Pick<T, K>` — subset of properties
- `Omit<T, K>` — excludes properties
- `Record<K, V>` — keyed map
- `NonNullable<T>` — strips `null | undefined`

Other utility types (`ReturnType`, `Parameters`, etc.) are not explicitly supported; they may or may not resolve depending on context.

## Generics

Generic type parameters are substituted before the metadata is emitted. A generic controller method with a concrete return type is fully resolved:

```typescript
async findOne(@Path('id') id: string): Promise<User> {}
// resolves the `Promise<User>` wrapper; return type is `User`
```

Generic base classes with unresolvable type parameters are skipped gracefully — the concrete subclass still contributes its own methods.

## Enums

Both string and numeric enums:

```typescript
enum Role { Admin = 'admin', User = 'user' }
// OpenAPI v3: { type: 'string', enum: ['admin', 'user'] }

enum Priority { Low, Medium, High }
// OpenAPI v3: { type: 'integer', enum: [0, 1, 2] }
```

Use `x-enum-varnames` (in `data.extra`) if you need the variant names surfaced for code generators.

## Nullable Types

`T | null` is modelled as a nullable `T`:

- **V2 emitter:** `x-nullable: true` (non-standard)
- **V3 emitter:** `nullable: true`

`$ref` siblings are handled correctly: V3 wraps the `$ref` in an `allOf` when `nullable` is set, so the output stays spec-compliant.

## Circular References

Self-referential types work. They emit `$ref` pointers to the named schema.

```typescript
type TreeNode = { value: string; children: TreeNode[] };
```

## Not Supported

- `ReturnType<T>`, `Parameters<T>`, `Awaited<T>` — sometimes resolve, sometimes do not; do not rely on them
- Template literal types — emitted as plain `string`
- Conditional types where the condition cannot be evaluated at compile time

For gaps that matter to you, open an issue — the metadata layer is deliberately extensible.
