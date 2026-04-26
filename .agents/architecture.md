# Architecture

## Core Pipeline

TRAPI follows a three-stage pipeline:

```
TypeScript Source Code → Metadata Extraction → OpenAPI Specification
     (decorators)         (@trapi/metadata)      (@trapi/swagger)
```

1. **Decorator Analysis** — The metadata package uses the TypeScript compiler API to parse source files, identify decorated classes/methods/parameters, and extract decorator arguments.

2. **Type Resolution** — The `adapters/typescript/resolver/` module walks TypeScript's type system to resolve interfaces, generics, unions, intersections, and utility types into a normalised type representation (`core/resolver/`). This is the most complex part of the codebase.

3. **Spec Generation** — The swagger package takes the normalised metadata and produces OpenAPI 2.0, 3.0, 3.1, or 3.2 JSON/YAML output. Lossy conversions (e.g. tuples → arrays) happen here, never in the metadata layer.

## Hexagonal Layering

Both `@trapi/metadata` and `@trapi/swagger` are organised into three layers with a strict dependency rule:

- **`core/`** — Domain types, port interfaces, constants. Imports nothing from `adapters/` or `app/`.
- **`adapters/`** — Infrastructure concerns: TypeScript compiler API, filesystem, cache, preset loading, OpenAPI emission, file writing. Imports from `core/` only.
- **`app/`** — Use-case orchestration. The public entry points `generateMetadata()` and `generateSwagger()` live here, wiring adapters against core contracts.

## Metadata Generation

The metadata generator modules in `@trapi/metadata`:

- **`app/generate.ts`** — `generateMetadata()` public entry point; loads tsconfig, scans source files, instantiates the generator.
- **`app/generator/metadata/`** — `MetadataGenerator` orchestrator; loads the v2 preset into a `Registry` and walks controllers.
- **`app/generator/controller/`** — Extracts controller-level metadata (routes, tags, security, inherited methods from base classes).
- **`app/generator/method/`** — Extracts method-level metadata (HTTP verb, path, responses, extensions).
- **`app/generator/parameter/`** — Extracts parameter metadata (body, query, path, form, header, cookie, file). Handles object decomposition for query/path of object type, and TS-side concerns (parameter optionality, default value, JSDoc description, declaration validators).
- **`adapters/typescript/resolver/`** — `TypeNodeResolver` resolves TypeScript types to metadata type nodes using the compiler's type checker. Reads decorators directly from the AST (no v1 abstraction layer); marker-driven lookups (see "Decorator System" below) discover preset-renamed decorators.

Each generator builds a draft via `applyDecoratorHandlers` + `applyJsDocHandlers` from the v2 orchestrator, then finalises the draft into `Controller`/`Method`/`Parameter`. The controller generator walks `heritageClauses` to include decorated methods from base classes, using the type checker to resolve import aliases. Inherited methods from generic base classes with unresolvable type parameters are skipped gracefully.

## Type Resolution

The resolver handles TypeScript type constructs:

- **Primitives**: `string` → `StringType`, `boolean` → `BooleanType`, `bigint` → `BigintType`, `void` → `VoidType`, `undefined` → `UndefinedType`, `never` → `NeverType`, `any` → `AnyType`.
- **Numeric types**: plain `number` resolves to `DoubleType`; `@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble` (or equivalent JSDoc tags) produce `IntegerType`/`LongType`/`FloatType`/`DoubleType`.
- **Interfaces/Classes**: Property enumeration with inheritance; emitted as `RefObjectType` when named, `NestedObjectLiteralType` for inline shapes.
- **Generics**: Type parameter substitution before emission.
- **Unions / Intersections**: `UnionType` / `IntersectionType` with `members`.
- **Arrays / Tuples**: `ArrayType` with element type; `TupleType` with named elements.
- **Enums**: String and numeric enums → `EnumType` or `RefEnumType`.
- **Utility types — explicit handling**: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `NonNullable`.
- **Utility types — checker-delegated**: `Extract`, `Exclude`, `ReturnType`, `Parameters`, `Awaited`, `InstanceType`, `ConstructorParameters` (the resolver lets the compiler compute the type, then walks the result).

## Decorator System (v2)

Presets declare **handlers** that match against a decorator name and mutate a **draft**:

```typescript
const controllerHandler = controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => {
        const path = readString(ctx.argument(0));
        draft.path = path ?? '';
    },
});
```

A `Preset` has `name`, optional `extends: string[]`, and arrays of handlers per kind: `controllers`, `methods`, `parameters`, `controllerJsDoc`, `methodJsDoc`, `parameterJsDoc`. `loadRegistry(preset, { resolver })` resolves the `extends` chain and applies `replaces` semantics, returning a flat `Registry`.

**Layers:**

- **Layer 1 — Source** (`adapters/decorator/v2/typescript/`): `buildDecoratorSources` extracts AST-agnostic `DecoratorSource[]` from a TS node; `buildJsDocSources` does the same for JSDoc tags. `readNodeDecorators` is a lightweight read-only variant for the type resolver.
- **Layer 2 — Drafts**: `ControllerDraft`/`MethodDraft`/`ParameterDraft` are mutable accumulators. Handlers contribute by mutating; the orchestrator finalises into the public `Controller`/`Method`/`Parameter` types.
- **Layer 3 — Handlers + Context**: `HandlerContext` exposes `argument(i)`, `arguments()`, `typeArgument(i)`, `parameterType()`, `host`. `JsDocHandlerContext` exposes `source`, `host`, `parameterType()`. Decorator and JSDoc handlers are separate kinds.
- **Layer 4 — Helpers**: `into('path').positional(0)`, `append('tags').positionalAll()`, `flag('hidden')`, identity builders (`controller(...)`, `method(...)`).
- **Layer 5 — Registry**: `Registry` is a flat per-kind list. The orchestrator iterates it for each TS node.
- **Layer 6 — Preset**: declarative `{ name, extends, controllers, methods, parameters, controllerJsDoc, methodJsDoc, parameterJsDoc }`.

**Locked design decisions** (Q1–Q10, see `.agents/plans/000-decorator-redesign.md`):

- Mutation model (handlers mutate the draft, orchestrator owns final assembly).
- `replaces: true | string` semantics: `true` shadows all parent matches; `'<presetName>'` shadows that preset's contributions; same-preset siblings are always additive.
- Decorator handlers run before JSDoc handlers on the same node (JSDoc as override layer).
- Fail-fast on handler exceptions (no graceful skip at handler layer).
- Preset shape is validated at load time via zod (in a `validup` container) — bad presets fail loud with a path to the offending field.

**Resolver markers.** Type-resolver concerns (`@Hidden` / `@IsInt` / `@Extension(...)` on properties) need to find decorators by *concept*, not by hardcoded name. Each handler can carry an optional `marker?: ResolverMarker` (one of `'hidden' | 'deprecated' | 'extension' | { numeric: 'int' | 'long' | 'float' | 'double' }`). The type resolver uses `namesForMarker(registry, predicate)` and `tagsForMarker(registry, predicate)` to enumerate decorator/JSDoc names that map to a given concept, then matches them against the AST. Preset authors who rename decorators (e.g. `@Hidden` → `@Skip`) keep working without resolver changes.

**Presets ship with the core repo:**

- `@trapi/decorators` — canonical reference preset (default export is the v2 `Preset`).
- `@trapi/preset-typescript-rest` — typescript-rest naming conventions.
- `@trapi/preset-decorators-express` — extends `@trapi/decorators`, adds Express-specific names (`@Request`/`@Response`/`@Next`, `@Headers`/`@Cookies`/`@Params` bulk handlers).

## Swagger Generator

The swagger emitters live under `adapters/generator/` and share an abstract base:

```
AbstractSpecGenerator (adapters/generator/abstract.ts)
├── V2Generator   — OpenAPI 2.0 / Swagger output
└── V3Generator   — OpenAPI 3.0 / 3.1 / 3.2 output (the version string is selected via constructor argument)
```

The abstract generator handles shared logic: schema building, reference resolution, model definitions, property building, enum schemas, ref alias/object schemas, operation IDs, parameter grouping. Version-specific differences are handled via abstract hooks:

- `getRefPrefix()` — `#/definitions/` (V2) vs `#/components/schemas/` (V3)
- `applyNullable()` — `x-nullable` (V2) vs `nullable` (V3)
- `markPropertyDeprecated()` — `x-deprecated` (V2) vs `deprecated` (V3)
- `assignPropertyDefaults()` — no-op (V2) vs sets `default` (V3)
- `resolveAdditionalProperties()` — `true` (V2) vs resolved type schema (V3)
- `getSchemaForIntersectionType()` — flattened properties (V2) vs `allOf` composition (V3)
- `getSchemaForUnionType()` — `x-anyOf`-style workaround (V2) vs `anyOf` (V3)

Version-specific generators also handle structural format differences (e.g., `requestBody` in V3 vs `in: body` parameters in V2). `V3Generator` covers 3.0, 3.1, and 3.2 via a single class; its `isV31OrLater()` check toggles behaviour like `$ref`-sibling stripping (OpenAPI 3.1 relaxed that restriction, so v3.1/v3.2 keep siblings while v3.0 strips them).

## Metadata Fidelity Principle

The metadata package (`@trapi/metadata`) must faithfully represent TypeScript's type system. When a TypeScript construct has no direct OpenAPI equivalent (e.g. tuples, branded types), the metadata layer must still model it accurately with a dedicated type (e.g. `TupleType` with named elements). Simplifications and lossy conversions for OpenAPI constraints happen exclusively in the swagger package (`@trapi/swagger`).

**Never collapse a TypeScript concept in the metadata layer to fit OpenAPI.** The metadata is a general-purpose intermediate representation — other consumers (routing code generators, validation libraries, documentation tools) may need the full type information.

Examples:

- Tuples → metadata emits `TupleType` with per-element names and types; swagger converts to `array` with `anyOf` items.
- Intersection types → metadata emits `IntersectionType` with members; V2 swagger flattens to properties, V3 uses `allOf`.
- `never` type → metadata emits `NeverType`; swagger omits the corresponding schema entirely.

## Caching

The metadata package includes an optional cache layer keyed on a hash of the **total byte size of all non-ignored source files** loaded through the TypeScript program (each source file contributes its end position). On a hit, the previously computed `Metadata` is returned directly and AST analysis is skipped.

Most meaningful edits change the total (adding lines, renaming identifiers to different lengths, adding files), so the cache invalidates automatically. The edge case is a **same-length edit** — e.g. swapping two identifiers of equal length — where the sum is preserved and the cache can serve stale data. In that situation the cache must be cleared manually or disabled.

`CacheOptions` fields: `enabled`, `directoryPath` (defaults to `os.tmpdir()`), `fileName?`, `clearAtRandom` (defaults to `true` outside `NODE_ENV=test`; randomly prunes the directory on ~10% of successful runs).
