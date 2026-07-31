# Project Structure

## Monorepo Layout

```
trapi/
├── packages/
│   ├── core/              # Framework-neutral domain types + decorator/preset machinery (no `typescript` dep)
│   ├── metadata/          # TS-coupled metadata extraction (depends on @trapi/core)
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
Layer 2 (generation): swagger, metadata
Layer 1 (contract):   core
```

- `@trapi/metadata` depends directly on `@trapi/core` and adds the TypeScript compiler integration on top of its contracts.
- `@trapi/swagger` depends **only** on `@trapi/core` (for `Metadata`, domain types, type guards). It does NOT depend on `@trapi/metadata` or the TypeScript compiler. Consumers compose `generateMetadata(...)` (from `@trapi/metadata`) with `generateSwagger({ metadata })` themselves; the CLI does this orchestration internally.
- Both framework presets peer-depend on `@trapi/core` only — they don't need the metadata generator. No cross-preset `extends` chain.
- **No re-export shim:** `@trapi/metadata` does NOT re-export `@trapi/core`. Consumers that want the contract surface install `@trapi/core` directly. This keeps `typescript` out of the install graph for preset-only consumers and for `@trapi/swagger` consumers that bring their own metadata.

## Package: `@trapi/core`

Framework-neutral contract surface used by `@trapi/metadata`, `@trapi/swagger`, presets, and any third-party consumer. Has no `typescript` dependency. Runtime deps: `@ebec/core`, `zod`, `validup`, `@validup/zod`, `locter`.

```text
packages/core/src/
├── controller/             # Controller domain type + IControllerGenerator port
├── method/                 # Method, MethodType, MethodName
├── parameter/              # Parameter, ArrayParameter, IParameterGenerator, ParameterSource, CollectionFormat
├── generator/              # Example, Response, Security
├── validator/              # Validator, ValidatorMeta, Validators, ValidatorName
├── resolver/               # Type union (StringType, ObjectType, RefObjectType, …), BaseType, TypeName, Extension, type guards
├── metadata/               # Metadata wrapper type + isMetadata guard (the framework-neutral output of any extractor)
├── decorator/              # Decorator/preset machinery (no orchestrator — that needs the TS compiler)
│   ├── types.ts            # DecoratorSource, drafts, handlers, contexts, Preset, Registry, ResolverMarker, UnmatchedDecoratorReport
│   ├── constants.ts        # ParamKind, CollectionKind, MarkerName, NumericKind, DecoratorTargetKind
│   ├── helpers.ts          # readString/readNumber/readBoolean/readStringOrStringArray/setControllerPaths/setMethodPath
│   ├── utils.ts            # matches/matchesJsDoc, draft factories, into/append/flag, marker lookups, identity builders
│   ├── module.ts           # loadRegistry, loadRegistryByName, resolvePresetByName (throws CoreError)
│   ├── validation/         # validatePreset (zod schemas + validup container)
│   └── test-helpers.ts     # literalArg/identifierArg/arrayArg/objectArg/typeArg/createHandlerContext
├── error/                  # CoreError, CoreErrorCode (PRESET_NOT_FOUND, PRESET_CYCLE, PRESET_REPLACES_NO_MATCH, PRESET_INVALID)
├── variable.ts             # VariableType
└── index.ts                # Public exports
```

## Package: `@trapi/metadata`

Adds the TypeScript compiler integration on top of `@trapi/core`. Internal layout still follows hexagonal layering — `core/` (TS-coupled config + errors + ports), `adapters/` (TS compiler, filesystem, cache, decorator orchestrator), `app/` (generator wiring + `generateMetadata` entry point).

```text
packages/metadata/src/
├── core/                   # TS-coupled contracts (everything framework-neutral lives in @trapi/core)
│   ├── config/             # MetadataGenerateOptions, MetadataGeneratorOptions, EntryPoint (uses CacheOptions)
│   ├── metadata/           # Metadata, IMetadataGenerator, IGeneratorContext, IResolverContext, IReferenceTypeRegistry, MetadataGeneratorContext
│   └── error/              # MetadataError (base), ConfigError, GeneratorError, ParameterError, ResolverError, ValidatorError + their *-codes files
│
├── adapters/               # Infrastructure adapters
│   ├── typescript/         # TypeScript compiler adapter
│   │   ├── resolver/       # TypeNodeResolver + sub-resolvers (primitive, union, mapped, ...)
│   │   ├── node-utils/     # TS AST helpers
│   │   ├── js-doc/         # JSDoc tag extraction
│   │   ├── initializer.ts  # Literal-value extraction from initializers
│   │   └── validator/      # Validator decorator parsing
│   ├── decorator/          # TS-coupled half of the decorator system
│   │   ├── orchestrator/   # applyDecoratorHandlers, applyJsDocHandlers, buildHandlerContext
│   │   └── typescript/     # buildDecoratorSources, buildJsDocSources, readNodeDecorators
│   ├── filesystem/         # scanSourceFiles, tsconfig loader
│   └── cache/              # CacheClient, buildCacheOptions, hashRegistry, generateFileHash
│
├── app/                    # Use-case orchestration
│   ├── generate.ts         # generateMetadata() — public entry point
│   └── generator/          # MetadataGenerator + ControllerGenerator, MethodGenerator, ParameterGenerator
│
└── index.ts                # Public exports (does NOT re-export @trapi/core)
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

Both preset packages organise handlers under `src/handlers/{controller,method,parameter,jsdoc,shared}.ts` and assemble the `Preset` in `src/index.ts`. Both packages `peerDependency` on `@trapi/core` (not `@trapi/metadata`) — the contract surface is all they need.

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
