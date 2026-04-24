# Supported TypeScript Types

TRAPI resolves TypeScript types through the compiler's own type checker, so the supported set tracks what the compiler itself understands. This page catalogues what is modelled, with notes on how each maps to OpenAPI output.

## Primitives

| TypeScript | Metadata `typeName` | OpenAPI |
| --- | --- | --- |
| `string` | `string` | `type: string` |
| `number` (default) | `double` | `type: number`, `format: double` |
| `boolean` | `boolean` | `type: boolean` |
| `bigint` | `bigint` | `type: integer` |
| `void` | `void` | Omitted response content |
| `undefined` | `undefined` | Nullable marker |
| `null` | — | Nullable marker |
| `never` | `never` | No schema emitted |
| `any` | `any` | No schema constraint |

### Numeric Refinements

A plain `number` resolves to `DoubleType` (OpenAPI `type: number`, `format: double`). To emit a more specific shape, either use a decorator from the `IS_*` family or a JSDoc tag on the containing declaration:

| Decorator | JSDoc tag | Metadata `typeName` | OpenAPI `type` | OpenAPI `format` |
| --- | --- | --- | --- | --- |
| `@IsInt()` | `@isInt` | `integer` | `integer` | `int32` |
| `@IsLong()` | `@isLong` | `long` | `integer` | `int64` |
| `@IsFloat()` | `@isFloat` | `float` | `number` | `float` |
| `@IsDouble()` | `@isDouble` | `double` | `number` | `double` |

TypeScript's `bigint` is a separate type and resolves to `BigintType` (`type: integer`, no `format`).

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

Handled explicitly by TRAPI's resolver:

- `Partial<T>` — all properties optional
- `Required<T>` — all properties required
- `Readonly<T>` — modifier only; structurally identical
- `Pick<T, K>` — subset of properties
- `Omit<T, K>` — excludes properties
- `Record<K, V>` — keyed map
- `NonNullable<T>` — strips `null | undefined`

Delegated to the TypeScript type checker (TRAPI lets the compiler compute the resolved type, then walks the result):

- `Extract<T, U>`
- `Exclude<T, U>`
- `ReturnType<T>`
- `Parameters<T>`
- `Awaited<T>`
- `InstanceType<T>`
- `ConstructorParameters<T>`

Other utility types may still resolve correctly via the compiler fallback, but are not guaranteed.

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

- Template literal types — emitted as plain `string`
- Conditional types where the condition cannot be evaluated statically
- Arbitrary mapped types with key remapping — simple mapped types work through the explicit utility set above

For gaps that matter to you, open an issue — the metadata layer is deliberately extensible.
