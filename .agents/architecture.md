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

## Package split

The framework-neutral contract surface lives in **`@trapi/core`** and has no `typescript` dependency:

- All domain types (`Type`, `BaseType`, `Controller`, `Method`, `Parameter`, `Extension`, `Example`, `Response`, `Security`, `Validator`, `MethodType`, `ParameterSource`, `CollectionFormat`, `TypeName`, …) and their type guards.
- The framework-neutral `Metadata` wrapper (`{ controllers, referenceTypes }`) and the `isMetadata` guard — the contract any extractor (TS-based, Babel-based, JSON cache, fixture) produces.
- The decorator/preset machinery: drafts, handlers, contexts, `Preset`, `Registry`, `loadRegistry`, `loadRegistryByName`, `resolvePresetByName`, `validatePreset`, identity builders, marker helpers, `into`/`append`/`flag` writers, `readString`/`readNumber`/etc.
- `CoreError` + `CoreErrorCode` (`PRESET_NOT_FOUND`, `PRESET_CYCLE`, `PRESET_REPLACES_NO_MATCH`, `PRESET_INVALID`).

**`@trapi/metadata`** depends on `@trapi/core` and adds the TypeScript-coupled half: the orchestrator (`applyDecoratorHandlers`, `applyJsDocHandlers`, `buildHandlerContext`), source extraction (`buildDecoratorSources`, `buildJsDocSources`, `readNodeDecorators`), `TypeNodeResolver` and sub-resolvers, the filesystem/cache adapters, and the `MetadataGenerator` use-case wiring (`generateMetadata`). Its TS-coupled errors (`MetadataError`, `ConfigError`, `GeneratorError`, `ParameterError`, `ResolverError`, `ValidatorError`) and TS-coupled context interfaces (`IGeneratorContext`, `IResolverContext`, `IReferenceTypeRegistry`, `IMetadataGenerator`, `MetadataGeneratorContext`, `MetadataGeneratorOptions`) stay in this package.

**`@trapi/metadata` does not re-export `@trapi/core`.** Consumers that need the contract surface install `@trapi/core` directly. Both first-party presets and `examples/decorators` `peerDependency` on `@trapi/core` only — they don't pull `typescript` into their install graph. **`@trapi/swagger` depends on `@trapi/core` only** (for `Metadata`, domain types, type guards) and has no runtime or type dependency on `@trapi/metadata` or the TypeScript compiler. `generateSwagger({ metadata })` accepts only a pre-built `Metadata`; consumers compose `generateMetadata(...)` (from `@trapi/metadata`) with `generateSwagger({ metadata })` themselves, and `@trapi/cli` performs that orchestration internally. Producers that aren't TS-based (cached JSON, Babel-based extractors, hand-rolled fixtures) can feed `generateSwagger` directly without installing `@trapi/metadata`.

## Hexagonal Layering

Both `@trapi/metadata` and `@trapi/swagger` are organised into three layers with a strict dependency rule:

- **`core/`** — TS-coupled domain types and ports specific to the package. `@trapi/core` provides the framework-neutral half. Imports nothing from `adapters/` or `app/`.
- **`adapters/`** — Infrastructure concerns: TypeScript compiler API, filesystem, cache, decorator orchestrator, OpenAPI emission, file writing. Imports from `core/` and `@trapi/core` only.
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

**Multi-mount controllers.** `Controller.paths: string[]` (always non-empty) holds every URL prefix the controller is mounted at — `@Controller(['/roles', '/realms/:id/roles'])` produces two entries, `@Controller('/roles')` produces one. Method paths stay scalar; the swagger emitter expands the cross product (see "Swagger Generator" below). Path-parameter validation in the parameter generator accepts a name if it appears in **any** `(controllerPath × methodPath)` combination, so `@Path('id')` is valid as long as `:id` shows up in at least one mount.

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
        const arg = ctx.argument(0);
        if (arg?.kind === 'literal' && typeof arg.raw === 'string') {
            draft.paths = [arg.raw];
        } else if (arg?.kind === 'array' && Array.isArray(arg.raw)) {
            draft.paths = arg.raw.filter((v): v is string => typeof v === 'string');
        } else {
            draft.paths = [''];
        }
    },
});
```

A `Preset` has `name`, optional `extends: string[]`, and arrays of handlers per kind: `controllers`, `methods`, `parameters`, `controllerJsDoc`, `methodJsDoc`, `parameterJsDoc`. `loadRegistry(preset, { resolver })` resolves the `extends` chain and applies `replaces` semantics, returning a flat `Registry`.

**Layers:**

- **Layer 1 — Source** (`@trapi/metadata/src/adapters/decorator/typescript/`): `buildDecoratorSources` extracts AST-agnostic `DecoratorSource[]` from a TS node; `buildJsDocSources` does the same for JSDoc tags. `readNodeDecorators` is a lightweight read-only variant for the type resolver. Lives in `@trapi/metadata` because it touches the TS compiler.
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

- `@trapi/preset-decorators-express` — self-contained: `@decorators/express` routing decorators (`@Controller`, `@Get`, `@Post`, `@Body`, `@Path`, …) plus Express-specific `@Headers`/`@Cookies`/`@Params`/`@Request`/`@Response`/`@Next`, plus all TRAPI markers and JSDoc handlers.
- `@trapi/preset-typescript-rest` — self-contained: typescript-rest naming (`@Path`, `@GET`, `@QueryParam`, `ContextRequest` family, …) with its own `@Description`/`@Example`/`@Security` shapes, plus the same TRAPI markers and JSDoc handlers as the express preset.

Neither preset `extends` the other. The repo deliberately ships no shared base preset — each framework preset is the single source of truth for its decorator vocabulary, so a user preset that extends one of them never picks up duplicate handlers from a transitive base.

`examples/decorators/` (private, unpublished) is a worked example of authoring a custom decorator runtime + matching `Preset` from scratch — it covers the same handler families as the framework presets.

**Configuring decorator handlers.** `MetadataGeneratorOptions` accepts handler configuration in three shapes:

- `preset?: string | Preset` — string identifier resolved via `resolvePresetByName` (npm package, relative path, or `module:` specifier), or an inline `Preset` object (still walked through `loadRegistry`, so its `extends` chain — if any — is resolved by name).
- `registry?: Registry` — already-resolved flat registry; useful for one-off custom handlers without authoring a full `Preset`. Build it with `createRegistry({ controllers: [...], methods: [...] })` — every kind is optional and defaults to `[]`.
- Both — they merge. The preset-derived registry comes first, the inline `registry` is appended after, so inline handlers run last in the orchestrator (winning on scalar mutations like `into('path')`, additively contributing on `append`-style fields).

Inline `registry` handlers cannot carry `replaces` semantics — those are enforced at preset-load time. To remove a preset handler, author a `Preset` with `replaces` and pass it via `preset` instead. The cache key folds in `preset.name` (when present) and `hashRegistry(merged)`, so toggling either contributor invalidates the cache.

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

**Path emission for multi-mount controllers.** Both emitters iterate `controller.paths × method.path` and emit one OpenAPI path entry per combination. `operationId` collisions across mounts are disambiguated with a numeric suffix (`list`, `list_2`, …) — V2 and V3 share a `uniqueOperationId(base, used)` helper for this. Path-bound parameters declared on the method are filtered per emitted URL: a parameter only appears on operations whose URL template actually contains `{name}` (so `:id` doesn't pollute the `/roles` operation when only `/realms/{realmId}/roles` declared it). Both V2 and V3 honour an explicit `method.operationId` override (preserved via `method.operationId || output.operationId` before disambiguation).

## Metadata Fidelity Principle

The metadata package (`@trapi/metadata`) must faithfully represent TypeScript's type system. When a TypeScript construct has no direct OpenAPI equivalent (e.g. tuples, branded types), the metadata layer must still model it accurately with a dedicated type (e.g. `TupleType` with named elements). Simplifications and lossy conversions for OpenAPI constraints happen exclusively in the swagger package (`@trapi/swagger`).

**Never collapse a TypeScript concept in the metadata layer to fit OpenAPI.** The metadata is a general-purpose intermediate representation — other consumers (routing code generators, validation libraries, documentation tools) may need the full type information.

Examples:

- Tuples → metadata emits `TupleType` with per-element names and types; swagger converts to `array` with `anyOf` items.
- Intersection types → metadata emits `IntersectionType` with members; V2 swagger flattens to properties, V3 uses `allOf`.
- `never` type → metadata emits `NeverType`; swagger omits the corresponding schema entirely.

## Caching

The metadata package includes an optional cache layer keyed on a composite SHA-256 over **five contributors**:

1. **`CACHE_SCHEMA_VERSION`** — manually bumped whenever the on-disk shape changes (`Controller`/`Method`/`Parameter`/resolver type nodes/cache wrapper).
2. **Source files** — file path + full text of every non-ignored source file in the TypeScript program. Catches any edit including same-length identifier renames.
3. **Compiler options** — stable JSON of `program.getCompilerOptions()`. Catches `tsconfig.json` changes (`target`, `strict`, `paths`, `jsx`, …).
4. **Resolved registry** — handler `match` / `marker` / `replaces` / `apply.toString()` for every kind. Catches local preset edits, preset upgrades, `extends`-chain changes.
5. **Preset name** — included verbatim for fast attribution.

The five parts are null-separated and folded into one sha256 hex digest (`composeCacheKey`). On a hit, controller and type-resolution work is skipped; the source-file walk that feeds the source-files hash still runs (it has to, to compute the key). Preset loading also runs on every call (even before the cache check) so its registry can contribute to the key — intentional, one `require` of cost.

**On-disk format.** Files live at `<directoryPath>/.trapi-metadata-<cacheKey>.json` (default `directoryPath`: `os.tmpdir()`). Each file embeds both `cacheKey` and `schemaVersion`; the reader cross-checks both, so collisions or schema drift fail closed.

**Atomicity.** Writes go to `<file>.<pid>.<rand>.tmp` and `rename` into place — concurrent generators see either the previous file or the new one, never a half-written truncation.

**Eviction.** `maxAgeMs` (default 7 days) is the only knob. After every successful save, files older than the cutoff are pruned opportunistically. Setting `maxAgeMs: 0` disables eviction.

**Bypass.** `strict` mode and `onUnmatchedDecorator` callbacks bypass the cache (read AND write) — strict reporting requires the handler dispatch to actually run, which a cache hit would skip.

`CacheOptions` fields: `enabled`, `directoryPath` (auto-created), `fileName?` (when set, collapses to a single-slot cache at that exact name), `maxAgeMs`.
