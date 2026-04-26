# Key Concepts

Before diving in, it helps to have a mental model of the pieces involved.

## Decorators

TRAPI reads the decorators already present in your source (`@Controller`, `@Get`, `@Body`, …). It never executes them — they stay as compile-time markers that the TypeScript compiler API can introspect.

Because decorator *names* differ from framework to framework, TRAPI normalises them via **handlers** declared in a **preset** (see below).

## Handlers

A **handler** is a function that matches against a decorator name (or JSDoc tag) and contributes to a draft. The orchestrator walks each TS node, dispatches its decorators to all matching handlers in the registry, and finalises the draft into a `Controller` / `Method` / `Parameter`.

```typescript
import { ParamKind, parameter } from '@trapi/metadata';

const bodyHandler = parameter({
    match: { name: 'Body', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Body; },
});
```

See [Decorators & Presets](/guide/metadata-decorators) for the full handler shape.

## Presets

A **preset** is a published package whose default export is a `Preset` — a name plus arrays of handlers per kind. Instead of describing handlers inline, you reference the package by name and TRAPI loads it:

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
2. A preset (built-in or your own) defines handlers that match those decorator names and mutate drafts.
3. `generateMetadata()` produces a normalised, framework-agnostic representation.
4. `generateSwagger()` turns that into an OpenAPI spec.
5. Anything else that wants to consume the metadata — validators, SDK generators, CLI tools — can do so directly.
