# Project Structure

## Monorepo Layout

```
trapi/
├── packages/
│   ├── metadata/          # Core metadata extraction from TS decorators
│   ├── swagger/           # OpenAPI spec generation from metadata
│   ├── preset-decorators-express/ # Self-contained preset for @decorators/express
│   ├── preset-typescript-rest/    # Self-contained preset for typescript-rest
│   ├── cli/               # `trapi` CLI (citty) wrapping the metadata + swagger pipeline
│   └── docs/              # VitePress documentation site
├── examples/
│   └── decorators/        # Worked example: custom runtime + matching v2 Preset
├── nx.json                # NX workspace config (build/test/lint caching)
├── tsconfig.json          # Base TS config (noEmit, baseUrl)
├── tsconfig.build.json    # Build config (ES2022, ESNext, ESM, declarations)
└── package.json           # NPM workspaces root
```

## Dependency Layers

Build order flows bottom-to-top:

```
Layer 3 (consumers):  preset-typescript-rest, preset-decorators-express, cli, docs
Layer 2 (generation): swagger
Layer 1 (core):       metadata
```

- `@trapi/swagger` depends directly on `@trapi/metadata`
- Both framework presets peer-depend on `@trapi/metadata` and are otherwise self-contained — no cross-preset `extends` chain.

## Package: `@trapi/metadata`

The core package. Analyses TypeScript source to extract decorator-based API metadata. Organised as a hexagonal architecture with a strict dependency rule: `core/` imports nothing from `adapters/` or `app/`; `adapters/` depends only on `core/`; `app/` wires both together.

```
packages/metadata/src/
├── core/                   # Domain types, ports, contracts (no external deps)
│   ├── types/              # Shared type definitions
│   ├── config/             # MetadataGenerateOptions, MetadataGeneratorOptions, EntryPoint
│   ├── controller/         # Controller domain type + IControllerGenerator port
│   ├── method/             # Method domain type + MethodType
│   ├── parameter/          # Parameter domain type + IParameterGenerator port
│   ├── resolver/           # Type union (StringType, ObjectType, RefObjectType, ...), TypeName
│   ├── metadata/           # Metadata, IMetadataGenerator, IGeneratorContext
│   ├── generator/          # Shared generator types (Response, Security, Example, Extension)
│   ├── validator/          # Validator types
│   ├── error/              # MetadataError, GeneratorError, ResolverError, ConfigError, ...
│   └── utils/              # Internal helpers (hasOwnProperty, normalizePath, isStringArray)
│
├── adapters/               # Infrastructure adapters
│   ├── typescript/         # TypeScript compiler adapter
│   │   ├── resolver/       # TypeNodeResolver + sub-resolvers (primitive, union, mapped, ...)
│   │   ├── node-utils/     # TS AST helpers
│   │   ├── js-doc/         # JSDoc tag extraction
│   │   ├── initializer.ts  # Literal-value extraction from initializers
│   │   └── validator.ts    # Validator decorator parsing
│   ├── decorator/          # The decorator system (handlers, drafts, registry, orchestrator)
│   │   ├── types.ts        # DecoratorSource, drafts, handlers, contexts, Preset, Registry, ResolverMarker
│   │   ├── constants.ts    # ParamKind, CollectionKind, MarkerName, NumericKind, DecoratorTargetKind
│   │   ├── module.ts       # loadRegistry, loadRegistryByName, resolvePresetByName
│   │   ├── utils.ts        # matches/matchesJsDoc, draft factories, into/append/flag, marker helpers
│   │   ├── orchestrator/   # applyDecoratorHandlers, applyJsDocHandlers, buildHandlerContext
│   │   ├── typescript/     # TS-specific source extraction (buildDecoratorSources, readNodeDecorators)
│   │   └── validation/     # validatePreset (zod schemas + validup container)
│   ├── filesystem/         # scanSourceFiles, tsconfig loader
│   └── cache/              # CacheClient, buildCacheOptions, generateFileHash
│
├── app/                    # Use-case orchestration
│   ├── generate.ts         # generateMetadata() — public entry point
│   └── generator/          # MetadataGenerator + ControllerGenerator, MethodGenerator, ParameterGenerator
│
└── index.ts                # Public exports (re-exports from core/, adapters/, app/)
```

## Package: `@trapi/swagger`

Transforms normalised metadata into OpenAPI specifications. Same hexagonal layering as `@trapi/metadata`.

```
packages/swagger/src/
├── core/                   # Domain types, ports, OpenAPI schemas
│   ├── config/             # SwaggerGenerateOptions, SwaggerGenerateData, Options
│   ├── constants.ts        # Version enum (v2, v3, v3.1, v3.2), DocumentFormat, SecurityType
│   ├── schema/             # SchemaV2, SchemaV3 shape definitions
│   │   ├── v2/
│   │   └── v3/
│   ├── types.ts            # SecurityDefinitions, DocumentFormatData
│   ├── error/              # SwaggerError
│   └── utils/              # Internal helpers
│
├── adapters/               # Emitters and file writer
│   ├── generator/
│   │   ├── abstract.ts     # AbstractSpecGenerator (shared emission logic)
│   │   ├── v2/             # V2Generator — OpenAPI 2.0 / Swagger
│   │   └── v3/             # V3Generator — OpenAPI 3.0, 3.1, 3.2
│   └── save/               # saveSwagger() — JSON/YAML file writer
│
├── app/                    # Use-case orchestration
│   └── module.ts           # generateSwagger()
│
└── index.ts                # Public exports
```

## Package: Presets

`preset-decorators-express` and `preset-typescript-rest` map framework-specific decorator names to v2 handlers. Each preset exports a `Preset` object as the default export. Both are **self-contained** — neither extends the other; each ships its own:

- HTTP routing handlers (matching the framework's decorator vocabulary).
- TRAPI markers (`@Hidden`, `@Tags`, `@Description`, `@Example`, `@Extension`, `@Security`, `@Produces`, `@Consumes`, `@Accept`, `@Deprecated`, `@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble`).
- JSDoc tag handlers (`/** @hidden */`, `/** @deprecated */`, `/** @summary */`, numeric narrowing tags).

Both preset packages organise handlers under `src/handlers/{controller,method,parameter,jsdoc,shared}.ts` and assemble the `Preset` in `src/index.ts`.

`preset-decorators-express` keys off `@decorators/express` decorator names (`@Controller`, `@Get`, `@Body`, …) plus Express-specific overrides for `@Headers`/`@Cookies`/`@Params`/`@Request`/`@Response`/`@Next`. `preset-typescript-rest` keys off typescript-rest's naming (`@Path`, `@GET`, `@QueryParam`, `ContextRequest` family, …) and ships its own `@Description`/`@Example`/`@Security` shapes that diverge from the marker defaults.

## Package: `@trapi/cli`

Thin [citty](https://github.com/unjs/citty)-based CLI that wraps `generateSwagger` + `saveSwagger`. The bin entry follows the authup pattern: an async factory `createCLIEntryPointCommand()` builds the root command, and `runMain()` dispatches subcommands.

```
packages/cli/src/
├── bin.ts             # Bin entry (#!/usr/bin/env node + runMain)
├── module.ts          # createCLIEntryPointCommand() — root command factory
├── commands/
│   ├── generate.ts    # `trapi generate` subcommand
│   └── index.ts
├── utils.ts           # readPackageJson() for meta
└── index.ts           # Re-exports the factory + commands
```

Bin name: `trapi`. Depends on `@trapi/metadata` and `@trapi/swagger`. Publishes its bin via the `bin` field in `package.json` (`"trapi": "dist/bin.mjs"`).
