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
    name: string;                         // the decorator's name in source
    properties?: DecoratorPropertyConfig[]; // where to read each logical property from
};
```

`name` is what TRAPI searches for in your AST. `properties` is an optional list describing where on the decorator call (which argument, which object field) each logical property lives.

### Minimal

```typescript
{ id: DecoratorID.GET, name: 'Get' }
```

Matches `@Get()` and `@Get('/path')` with sensible defaults: positional argument `0` is treated as the route path.

### Positional Arguments

```typescript
{
    id: DecoratorID.RESPONSE_DESCRIPTION,
    name: 'Response',
    properties: [
        { type: 'status-code', index: 0 },
        { type: 'description', index: 1 },
    ],
}
```

Interprets `@Response(404, 'Not Found')` as `{ statusCode: 404, description: 'Not Found' }`.

### Options Object

Some libraries pass a single options object instead of positional arguments:

```typescript
{
    id: DecoratorID.CONTROLLER,
    name: 'Controller',
    properties: [
        { type: 'path', strategy: 'object', key: 'path' },
    ],
}
```

Matches `@Controller({ path: '/users' })` and pulls `path` from the options object.

## Presets

A **preset** is a published npm package that exports a ready-made `DecoratorConfig[]` plus metadata TRAPI uses for load-time diagnostics.

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

## Merging Presets with Overrides

If you use a preset but one of your decorators has a non-standard name, combine both:

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/decorators',
    decorators: [
        // Keep everything the preset defines; override only CONTROLLER
        { id: DecoratorID.CONTROLLER, name: 'Route' },
    ],
});
```

Entries in `decorators` override the preset for matching `id` values.

## Writing Your Own

If your decorators live in-house, you can author a mapping inline. To reuse it across projects, publish it as a [Custom Preset](/guide/advanced-custom-presets).
