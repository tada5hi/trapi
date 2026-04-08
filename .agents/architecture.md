# Architecture

## Core Pipeline

TRAPI follows a three-stage pipeline:

```
TypeScript Source Code → Metadata Extraction → OpenAPI Specification
     (decorators)         (@trapi/metadata)      (@trapi/swagger)
```

1. **Decorator Analysis** — The metadata package uses the TypeScript compiler API to parse source files, identify decorated classes/methods/parameters, and extract decorator arguments.

2. **Type Resolution** — The `resolver/` module walks TypeScript's type system to resolve interfaces, generics, unions, intersections, and utility types into a normalized type representation. This is the most complex part of the codebase.

3. **Spec Generation** — The swagger package takes the normalized metadata and produces OpenAPI 2.0 or 3.0 JSON/YAML output.

## Metadata Generation

The metadata generator modules:

- **`generator/metadata/`** — Top-level orchestration: coordinates the full metadata extraction pipeline
- **`generator/abstract.ts`** — Base generator class with shared logic
- **`generator/controller/`** — Extracts controller-level metadata (routes, middleware)
- **`generator/method/`** — Extracts method-level metadata (HTTP verb, path, responses)
- **`generator/parameter/`** — Extracts parameter metadata (body, query, path, etc.)
- **`generator/type.ts`** — Resolves TypeScript types to metadata type nodes using the compiler's type checker

Each generator level reads decorators and delegates to the next level down.

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

The abstract generator handles shared logic (schema building, reference resolution, model definitions). Version-specific generators handle format differences (e.g., `requestBody` in v3 vs. `in: body` parameters in v2).

## Caching

The metadata package includes a cache layer to avoid re-parsing unchanged files during watch-mode development. Cache invalidation is based on file modification timestamps.
