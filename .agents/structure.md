# Project Structure

## Monorepo Layout

```
trapi/
├── packages/
│   ├── metadata/          # Core metadata extraction from TS decorators
│   ├── swagger/           # OpenAPI spec generation from metadata
│   ├── decorators/        # Reference decorator preset (HTTP methods, params, etc.)
│   ├── preset-typescript-rest/    # typescript-rest adapter
│   ├── preset-decorators-express/ # @decorators/express adapter
│   └── docs/              # VitePress documentation site
├── nx.json                # NX workspace config (build/test/lint caching)
├── tsconfig.json          # Base TS config (noEmit, baseUrl)
├── tsconfig.build.json    # Build config (ES2022, ESNext, ESM, declarations)
└── package.json           # NPM workspaces root
```

## Dependency Layers

Build order flows bottom-to-top:

```
Layer 3 (consumers):  preset-typescript-rest, preset-decorators-express, docs
Layer 2 (generation): swagger, decorators
Layer 1 (core):       metadata
```

- `@trapi/swagger` depends directly on `@trapi/metadata`
- `@trapi/decorators` peer-depends on `@trapi/metadata`
- Both presets depend on `@trapi/decorators`

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
│   ├── decorator/          # DecoratorID enum, DecoratorConfig, PresetSchema, decorator sets
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
│   ├── decorator/          # DecoratorResolver, DecoratorPropertyManager, preset loader
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

## Package: `@trapi/decorators`

```
packages/decorators/src/
├── decorators/     # Decorator builder functions (Controller, Get, Body, Path, ...) and their schema definitions
├── module.ts       # Aggregated PresetSchema (extends: [], items: [...])
└── index.ts        # Re-exports decorators and the schema as default export
```

Publishes as `@trapi/decorators`. Acts both as a runnable decorator library and as a TRAPI preset — `preset: '@trapi/decorators'` loads this package's default export.

## Package: Presets

`preset-typescript-rest` and `preset-decorators-express` map framework-specific decorators to TRAPI's internal `DecoratorID` enum. They allow TRAPI to work with existing decorator libraries without requiring code changes. Each preset is a small package with a single default-exported `PresetSchema`.
