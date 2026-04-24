# Key Concepts

Before diving in, it helps to have a mental model of the pieces involved.

## Decorators

TRAPI reads the decorators already present in your source (`@Controller`, `@Get`, `@Body`, …). It never executes them — they stay as compile-time markers that the TypeScript compiler API can introspect.

Because decorator *names* differ from framework to framework, TRAPI normalises them via a **decorator mapping**.

## DecoratorID

`DecoratorID` is TRAPI's semantic enum. Every supported concept — class-level route, HTTP verb, parameter source, response shape — has a member.

```typescript
import { DecoratorID } from '@trapi/metadata';

DecoratorID.CONTROLLER  // class-level route prefix
DecoratorID.GET         // GET method
DecoratorID.BODY        // parameter bound to the request body
DecoratorID.QUERY       // parameter bound to a query string value
// ...
```

See the [API Reference](/guide/metadata-api-reference#decoratorid) for the full list.

## Decorator Mapping

A **mapping** tells TRAPI which decorator names in your code correspond to which `DecoratorID`. It can be supplied inline as `decorators`, or loaded by name as `preset`.

```typescript
import { DecoratorID } from '@trapi/metadata';

const decorators = [
    { id: DecoratorID.CONTROLLER, name: 'Controller' },
    { id: DecoratorID.GET,        name: 'Get' },
    { id: DecoratorID.POST,       name: 'Post' },
    { id: DecoratorID.BODY,       name: 'Body' },
    // ...
];
```

See [Decorators & Presets](/guide/metadata-decorators) for the full schema.

## Presets

A **preset** is a published package that exports a decorator mapping. Instead of describing the mapping inline, you reference the package by name and TRAPI loads it:

```typescript
await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/decorators',
});
```

The monorepo ships three:

| Preset | For |
| --- | --- |
| `@trapi/decorators` | The reference decorator set TRAPI itself defines |
| `@trapi/preset-typescript-rest` | [typescript-rest](https://github.com/thiagobustamante/typescript-rest) |
| `@trapi/preset-decorators-express` | [@decorators/express](https://github.com/serhiisol/node-decorators) |

You can also publish your own. See [Custom Presets](/guide/advanced-custom-presets).

## Metadata

The output of `generateMetadata()` is a plain `Metadata` object:

```typescript
type Metadata = {
    controllers: Controller[];
    referenceTypes: Record<string, ReferenceType>;
};
```

It is a faithful representation of your decorated source — no OpenAPI-specific simplifications are baked in. Consumers that need the full TypeScript type information (tuples with named elements, branded types, …) get it.

## Type Resolver

The resolver walks TypeScript's type system to turn type annotations into a normalised representation:

- primitives (`string`, `number`, …)
- classes and interfaces, with inherited properties
- generics with type parameter substitution
- unions, intersections, tuples
- utility types (`Partial`, `Pick`, `Omit`, `Record`, `NonNullable`, `Required`, `Readonly`)
- string and numeric enums

For the full support matrix, see [Supported TypeScript Types](/guide/advanced-type-support).

## OpenAPI Emission

`@trapi/swagger` consumes the metadata and emits an OpenAPI document. Version-specific differences (`nullable` vs `x-nullable`, `requestBody` vs `in: body`, `allOf` vs flattened intersections) are handled by dedicated emitters — the metadata layer never makes OpenAPI-driven compromises.

## The Short Version

1. You write decorators. TRAPI does not care which ones.
2. You describe how your decorators map to `DecoratorID` values.
3. `generateMetadata()` produces a normalised, framework-agnostic representation.
4. `generateSwagger()` turns that into an OpenAPI spec.
5. Anything else that wants to consume the metadata — validators, SDK generators, CLI tools — can do so directly.
