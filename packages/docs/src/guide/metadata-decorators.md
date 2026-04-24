# Decorators & Presets

TRAPI's core design decision is that decorators are configurable. You tell it which decorator in your code represents which concept — TRAPI never assumes a specific naming scheme.

## DecoratorID

`DecoratorID` is the semantic enum. Every decorator TRAPI understands corresponds to one of its members.

### Class-level

| ID | Meaning |
| --- | --- |
| `CONTROLLER` | Marks a class as a controller; value is the route prefix |
| `MOUNT` | Sub-mount point for composing controllers |
| `TAGS` | Tag(s) for grouping in the OpenAPI spec |
| `DEPRECATED` | Marks the controller or method as deprecated |
| `HIDDEN` | Excludes the controller or method from the generated spec |
| `SECURITY` | Applies a security scheme requirement |
| `EXTENSION` | Arbitrary `x-*` extensions on the generated schema |

### HTTP Methods

| ID | Verb |
| --- | --- |
| `GET` / `POST` / `PUT` / `DELETE` / `PATCH` / `OPTIONS` / `HEAD` | The verb |
| `ALL` | All verbs |

### Parameter Sources

| ID | Binds to |
| --- | --- |
| `PATH` / `PATHS` | Path parameter(s) |
| `QUERY` | Query string |
| `BODY` | Request body |
| `FORM` | Form field |
| `HEADER` / `HEADERS` | Request header(s) |
| `COOKIE` / `COOKIES` | Cookie(s) |
| `FILE` / `FILES` | Uploaded file(s) |
| `PARAM` / `PARAMS` | Generic parameter binding |
| `CONTEXT` | Framework-provided context (ignored in OpenAPI output) |

### Content Negotiation

| ID | Meaning |
| --- | --- |
| `ACCEPT` / `CONSUMES` | Accepted request content types |
| `PRODUCES` | Produced response content types |
| `DESCRIPTION` | Description text for a method or response |
| `EXAMPLE` | Example payload for a response |

### Parameter Refinements

| ID | Meaning |
| --- | --- |
| `IS_INT` / `IS_LONG` / `IS_FLOAT` / `IS_DOUBLE` | Numeric precision hint |

## DecoratorConfig

A single mapping entry:

```typescript
type DecoratorConfig = {
    id: `${DecoratorID}`;
    name: string;
    properties?: {
        [propertyName: string]: DecoratorPropertyConfigInput;
    };
};

type DecoratorPropertyConfigInput = Partial<{
    isType: boolean;       // default: false — true when the argument carries a type reference
    index: number;         // default: 0 — positional argument to read from
    amount?: number;       // how many arguments starting from `index` to consume (-1 = all remaining)
    strategy?: 'merge' | ((...items: any[]) => any);
}>;
```

`name` is the decorator's identifier as it appears in your source. `properties` is a map keyed by **logical property name** — the keys depend on the `id` (see [Property Names by DecoratorID](#property-names-by-decoratorid) below). Each value tells TRAPI where on the decorator call to read that property from.

### Minimal

```typescript
{ id: DecoratorID.GET, name: 'Get' }
```

Matches `@Get()` and `@Get('/path')` with sensible defaults: positional argument `0` is treated as the route path.

### Positional Arguments

```typescript
{
    id: DecoratorID.DESCRIPTION,
    name: 'Response',
    properties: {
        statusCode: { index: 0 },
        description: { index: 1 },
        payload: { index: 2 },
        type: { isType: true },
    },
}
```

Interprets `@Response<User>(404, 'Not Found')` by reading the status code from argument 0, the description from argument 1, and a type reference from the decorator's type argument.

### Variadic Arguments

Some decorators accept any number of arguments and expect them merged into an array. Use `amount: -1` together with `strategy: 'merge'`:

```typescript
{
    id: DecoratorID.ACCEPT,
    name: 'Accept',
    properties: {
        value: { amount: -1, strategy: 'merge' },
    },
}
```

Matches `@Accept('application/json', 'application/xml')` and yields `value: ['application/json', 'application/xml']`.

### Type References

When an argument is a *type* rather than a value (e.g. an `@Example<User>({ ... })` decorator), set `isType: true`. TRAPI reads the type argument from the decorator call instead of a runtime value.

### Property Names by DecoratorID

Each `DecoratorID` has its own property schema. A quick reference for the common ones:

| DecoratorID | Property names | Expected value |
| --- | --- | --- |
| `CONTROLLER`, `MOUNT`, HTTP verbs (`GET`, `POST`, …) | `value` | `string` — the route path |
| `TAGS` | `value` | `string[]` — tag names |
| `DESCRIPTION` | `statusCode`, `description`, `payload`, `type` | — |
| `EXAMPLE` | `type`, `payload`, `label` (optional) | — |
| `SECURITY` | `key`, `value` | scheme name + required scopes |
| `PRODUCES`, `ACCEPT`, `CONSUMES` | `value` | `string[]` — media types |
| `QUERY`, `BODY`, `HEADER`, `PATH`, `FORM`, `COOKIE`, `FILE`, … | `value` | `string` — parameter name |
| `HIDDEN`, `DEPRECATED` | — | marker only, no properties |
| `EXTENSION` | `key`, `value` | `x-*` key + value |

For the full, type-safe schema see `DecoratorClassSetProperties`, `DecoratorMethodSetProperties`, `DecoratorParameterSetProperties`, etc. in the source.

## Presets

A **preset** is a published npm package whose default export is a `PresetSchema`:

```typescript
type PresetSchema = {
    extends: string[];          // other preset package names to inherit from
    items: DecoratorConfig[];   // this preset's mapping entries
};
```

`extends` lets a preset build on top of another by package name — TRAPI loads each referenced preset recursively and concatenates the `items`.

Shipped presets:

| Preset | Framework |
| --- | --- |
| `@trapi/decorators` | Reference decorator set (also an actual usable library) |
| `@trapi/preset-typescript-rest` | [typescript-rest](https://github.com/thiagobustamante/typescript-rest) |
| `@trapi/preset-decorators-express` | [@decorators/express](https://github.com/serhiisol/node-decorators) |

Use one by name:

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-typescript-rest',
});
```

Presets are resolved via Node's module resolution, so they must be installed as regular dependencies.

## Combining Presets with Additional Mappings

If you use a preset but also have a decorator with a non-standard name, supply both:

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/decorators',
    decorators: [
        // Recognise @Route(...) *in addition to* the preset's @Controller(...)
        { id: DecoratorID.CONTROLLER, name: 'Route', properties: { value: {} } },
    ],
});
```

Mappings are additive: entries in `decorators` are concatenated with the preset's entries, and TRAPI tries them in order (user entries first). Both decorator names will be recognised for the same `DecoratorID`. If you genuinely want to replace a preset entry rather than add to it, don't load the preset — supply your own `decorators` list directly.

## Writing Your Own

If your decorators live in-house, you can author a mapping inline. To reuse it across projects, publish it as a [Custom Preset](/guide/advanced-custom-presets).
