# Philosophy

## Why TRAPI?

Most tools that extract OpenAPI specifications from TypeScript decorators ship their own decorator set, which you have to adopt. TRAPI takes the opposite approach: **decorator-framework agnosticism**.

Most TypeScript REST frameworks — Express with decorators, typescript-rest, routing-controllers — define their own decorator sets. Each framework's decorators carry the same semantic meaning (`@Get()`, `@Post()`, `@Body()`, `@Query()`), but with different names, import paths, and conventions. TRAPI lets you **map any decorator set** to a shared metadata model instead of rewriting your controllers.

## Core Principles

### 1. Bring Your Own Decorators

TRAPI does not force you to adopt a specific decorator library. Instead, you define a **preset** — a set of handlers that tell TRAPI which decorator in your codebase corresponds to which semantic concept (controller, HTTP method, parameter source, etc.).

```typescript
// Example: a preset mapping a custom decorator library to TRAPI's metadata model
import { type Preset, controller, method, parameter, ParamKind } from '@trapi/metadata';

const preset: Preset = {
    name: 'my-app/preset',
    controllers: [
        controller({ match: { name: 'Controller', on: 'class' },
                     apply: (ctx, draft) => { /* read path from ctx.argument(0) */ } }),
    ],
    methods: [
        method({ match: { name: 'Get', on: 'method' },
                 apply: (_ctx, draft) => { draft.verb = 'get'; } }),
        method({ match: { name: 'Post', on: 'method' },
                 apply: (_ctx, draft) => { draft.verb = 'post'; } }),
    ],
    parameters: [
        parameter({ match: { name: 'Body', on: 'parameter' },
                    apply: (_ctx, draft) => { draft.in = ParamKind.Body; } }),
    ],
};
```

This means any HTTP framework built on TypeScript decorators can get metadata extraction and OpenAPI generation for free — without changing a single line of application code.

### 2. Pure AST Analysis

TRAPI extracts metadata entirely through **static analysis** of the TypeScript AST. Decorators are no-ops at runtime — they exist only as markers for the compiler API to read. There is no dependency on `reflect-metadata` or runtime type information.

This has several advantages:

- **Zero runtime overhead** — decorators add no behaviour to your application
- **Build-time safety** — metadata errors are caught during generation, not at runtime
- **Framework independence** — works with any TypeScript version and any decorator style

### 3. Separation of Concerns

The pipeline is split into independent, composable packages:

| Layer | Package | Responsibility |
|-------|---------|----------------|
| Core | `@trapi/metadata` | Extract metadata from TypeScript source |
| Output | `@trapi/swagger` | Transform metadata into OpenAPI specs |
| Markers | `@trapi/decorators` | TRAPI-specific markers (`@Hidden`, `@Tags`, `@Description`, `@IsInt`, …) |
| Presets | `@trapi/preset-*` | Framework-specific decorator mappings |

Each layer can be used independently. You can use `@trapi/metadata` alone to power custom code generators, route validators, or documentation tools — the metadata representation is not tied to OpenAPI.

### 4. TypeScript Compiler as the Source of Truth

Rather than inventing a parallel type system or requiring JSDoc annotations for everything, TRAPI leverages the TypeScript compiler's own type checker. When you write:

```typescript
@Get()
find(@Query('status') status: 'active' | 'inactive'): Promise<User[]> {
```

TRAPI resolves `'active' | 'inactive'` and `Promise<User[]>` through the same type checker that powers your IDE. Generics, utility types (`Partial<T>`, `Pick<T, K>`), intersections, mapped types — they all resolve through TypeScript itself, not through a reimplemented type system.

### 5. Metadata, Not Routes

TRAPI intentionally does **not** generate route handlers or perform runtime validation. These are orthogonal concerns best handled by the HTTP framework you already chose. TRAPI focuses on doing one thing well: turning your decorated TypeScript into accurate API metadata and specifications.

## When to Use TRAPI

TRAPI is the right choice when:

- You already use a decorator-based HTTP framework and want OpenAPI docs without adopting a new decorator set
- You want metadata extraction as a build step, not a runtime dependency
- You need to support multiple frameworks with the same tooling
- You want the metadata for purposes beyond OpenAPI (custom generators, validators, SDK generation)

If you need an all-in-one solution that also handles routing and runtime validation from a single decorator set, TRAPI is probably not the right fit — pick a tool that bundles those concerns. TRAPI is for teams that want to keep those concerns separate.
