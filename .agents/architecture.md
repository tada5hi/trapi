# Architecture

## Core Pipeline

TRAPI follows a three-stage pipeline:

```
TypeScript Source Code → Metadata Extraction → OpenAPI Specification
     (decorators)         (@trapi/metadata)      (@trapi/swagger)
```

1. **Decorator Analysis** — The metadata package uses the TypeScript compiler API to parse source files, identify decorated classes/methods/parameters, and extract decorator arguments.

2. **Type Resolution** — The `resolver/` module walks TypeScript's type system to resolve interfaces, generics, unions, intersections, and utility types into a normalized type representation. This is the most complex part of the codebase.

3. **Spec Generation** — The swagger package takes the normalized metadata and produces OpenAPI 2.0 or 3.0 JSON/YAML output. Lossy conversions (e.g. tuples → arrays) happen here, never in the metadata layer.

## Metadata Generation

The metadata generator modules:

- **`generator/metadata/`** — Top-level orchestration: coordinates the full metadata extraction pipeline
- **`generator/abstract.ts`** — Base generator class with shared logic
- **`generator/controller/`** — Extracts controller-level metadata (routes, middleware, inherited methods from base classes)
- **`generator/method/`** — Extracts method-level metadata (HTTP verb, path, responses)
- **`generator/parameter/`** — Extracts parameter metadata (body, query, path, etc.)
- **`generator/type.ts`** — Resolves TypeScript types to metadata type nodes using the compiler's type checker

Each generator level reads decorators and delegates to the next level down. The controller generator walks `heritageClauses` to include decorated methods from base classes, using the type checker to resolve import aliases. Inherited methods from generic base classes with unresolvable type parameters are skipped gracefully.

## Type Resolution

The resolver handles TypeScript type constructs:

- **Primitives**: string, number, boolean, void, etc.
- **Interfaces/Classes**: Property enumeration with inheritance
- **Generics**: Type parameter substitution
- **Unions/Intersections**: Composite type handling
- **Utility types**: `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, `Record<K, V>`, etc.
- **Enums**: String and numeric enum values
- **Arrays/Tuples**: Element type extraction

## Decorator System

Decorators are mapped via a `DecoratorConfig` that associates decorator names with `DecoratorID` values:

```typescript
// Example preset mapping
{
    [DecoratorID.CONTROLLER]: { name: 'Controller' },
    [DecoratorID.GET]: { name: 'MethodGet' },
    [DecoratorID.POST]: { name: 'MethodPost' },
    // ...
}
```

Presets provide alternative mappings for different frameworks (typescript-rest, @decorators/express), allowing TRAPI to work with existing codebases.

## Swagger Generator

The swagger generator extends an abstract base class:

```
SwaggerGenerator (abstract.ts)
├── V2Generator   — OpenAPI 2.0 / Swagger output
└── V3Generator   — OpenAPI 3.0 output
```

The abstract generator handles shared logic: schema building, reference resolution, model definitions, property building, enum schemas, and ref alias/object schemas. Version-specific differences are handled via abstract hooks:

- `getRefPrefix()` — `#/definitions/` (V2) vs `#/components/schemas/` (V3)
- `applyNullable()` — `x-nullable` (V2) vs `nullable` (V3)
- `markPropertyDeprecated()` — `x-deprecated` (V2) vs `deprecated` (V3)
- `assignPropertyDefaults()` — no-op (V2) vs sets `default` (V3)
- `resolveAdditionalProperties()` — `true` (V2) vs resolved type schema (V3)

Version-specific generators handle structural format differences (e.g., `requestBody` in V3 vs `in: body` parameters in V2, `allOf` composition in V3 vs flattened properties in V2).

## Metadata Fidelity Principle

The metadata package (`@trapi/metadata`) must faithfully represent TypeScript's type system. When a TypeScript construct has no direct OpenAPI equivalent (e.g. tuples, branded types), the metadata layer must still model it accurately with a dedicated type (e.g. `TupleType` with named elements). Simplifications and lossy conversions for OpenAPI constraints happen exclusively in the swagger package (`@trapi/swagger`).

**Never collapse a TypeScript concept in the metadata layer to fit OpenAPI.** The metadata is a general-purpose intermediate representation — other consumers (routing code generators, validation libraries, documentation tools) may need the full type information.

Examples:
- Tuples → metadata emits `TupleType` with per-element names and types; swagger converts to `array` with `anyOf` items
- Intersection types → metadata emits `IntersectionType` with members; V2 swagger flattens to properties, V3 uses `allOf`

## Caching

The metadata package includes a cache layer to avoid re-parsing unchanged files during watch-mode development. Cache invalidation is based on file modification timestamps.
