# Philosophy

## Why TRAPI?

Libraries like [tsoa](https://github.com/lukeautry/tsoa) pioneered the idea of extracting OpenAPI specifications from TypeScript decorators. TRAPI shares that vision but takes a fundamentally different approach: **decorator-framework agnosticism**.

Most TypeScript REST frameworks — Express with decorators, typescript-rest, routing-controllers — define their own decorator sets. Each framework's decorators carry the same semantic meaning (`@Get()`, `@Post()`, `@Body()`, `@Query()`), but with different names, import paths, and conventions. tsoa solves this by shipping its own decorator set that you must adopt. TRAPI solves it by letting you **map any decorator set** to a shared metadata model.

## Core Principles

### 1. Bring Your Own Decorators

TRAPI does not force you to adopt a specific decorator library. Instead, you define a **decorator mapping** — a configuration that tells TRAPI which decorator in your codebase corresponds to which semantic concept (controller, HTTP method, parameter source, etc.).

```typescript
// Example: mapping @decorators/express to TRAPI's metadata model
{
    [DecoratorID.CONTROLLER]: { name: 'Controller' },
    [DecoratorID.GET]: { name: 'Get' },
    [DecoratorID.POST]: { name: 'Post' },
    [DecoratorID.BODY]: { name: 'Body' },
    // ...
}
```

This means any HTTP framework built on TypeScript decorators can get metadata extraction and OpenAPI generation for free — without changing a single line of application code.

### 2. Pure AST Analysis

TRAPI extracts metadata entirely through **static analysis** of the TypeScript AST. Decorators are no-ops at runtime — they exist only as markers for the compiler API to read. There is no dependency on `reflect-metadata` or runtime type information.

This has several advantages:
- **Zero runtime overhead** — decorators add no behavior to your application
- **Build-time safety** — metadata errors are caught during generation, not at runtime
- **Framework independence** — works with any TypeScript version and any decorator style

### 3. Separation of Concerns

The pipeline is split into independent, composable packages:

| Layer | Package | Responsibility |
|-------|---------|----------------|
| Core | `@trapi/metadata` | Extract metadata from TypeScript source |
| Output | `@trapi/swagger` | Transform metadata into OpenAPI specs |
| Mapping | `@trapi/decorators` | Default decorator set and mapping |
| Presets | `@trapi/preset-*` | Framework-specific decorator mappings |

Each layer can be used independently. You can use `@trapi/metadata` alone to power custom code generators, route validators, or documentation tools — the metadata representation is not tied to OpenAPI.

### 4. TypeScript Compiler as the Source of Truth

Rather than inventing a parallel type system or requiring JSDoc annotations for everything, TRAPI leverages the TypeScript compiler's own type checker. When you write:

```typescript
@Get()
find(@Query('status') status: 'active' | 'inactive'): Promise<User[]> {
```

TRAPI resolves `'active' | 'inactive'` and `Promise<User[]>` through the same type checker that powers your IDE. Generics, utility types (`Partial<T>`, `Pick<T, K>`), intersections, mapped types — they all resolve through TypeScript itself, not through a reimplemented type system.

## TRAPI vs tsoa

| Aspect | TRAPI | tsoa |
|--------|-------|------|
| Decorator source | Any framework's decorators (via presets) | tsoa's own decorators only |
| Runtime behavior | Decorators are no-ops | Decorators are no-ops |
| Type resolution | TypeScript compiler API | TypeScript compiler API |
| Output | OpenAPI 2.0 / 3.0 | OpenAPI 2.0 / 3.0 / 3.1 |
| Route generation | No (metadata only) | Yes (generates Express/Koa/Hapi routes) |
| Runtime validation | No (build-time only) | Yes (validates requests at runtime) |
| Framework lock-in | None | Must use tsoa decorators |

TRAPI intentionally does **not** generate route handlers or perform runtime validation. These are orthogonal concerns best handled by the HTTP framework you already chose. TRAPI focuses on doing one thing well: turning your decorated TypeScript into accurate API metadata and specifications.

## When to Use TRAPI

TRAPI is the right choice when:

- You already use a decorator-based HTTP framework and want OpenAPI docs without adopting a new decorator set
- You want metadata extraction as a build step, not a runtime dependency
- You need to support multiple frameworks with the same tooling
- You want the metadata for purposes beyond OpenAPI (custom generators, validators, SDK generation)

If you need an all-in-one solution that handles routing, validation, and documentation from a single decorator set, tsoa is a great choice. TRAPI is for teams that want to keep those concerns separate.
