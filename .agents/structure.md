# Project Structure

## Monorepo Layout

```
trapi/
├── packages/
│   ├── metadata/          # Core metadata extraction from TS decorators
│   ├── swagger/           # OpenAPI spec generation from metadata
│   ├── decorators/        # Decorator preset (HTTP methods, params, etc.)
│   ├── preset-typescript-rest/    # typescript-rest adapter
│   ├── preset-decorators-express/ # @decorators/express adapter
│   └── docs/              # VitePress documentation site
├── nx.json                # NX workspace config (build/test/lint caching)
├── tsconfig.json          # Base TS config (noEmit, baseUrl)
├── tsconfig.build.json    # Build config (ES2020, CommonJS, declarations)
└── package.json           # NPM workspaces root
```

## Dependency Layers

Build order flows bottom-to-top:

```
Layer 3 (consumers):  preset-typescript-rest, preset-decorators-express, docs
Layer 2 (generation): swagger, decorators
Layer 1 (core):       metadata
```

- `@trapi/swagger` depends on `@trapi/metadata`
- `@trapi/decorators` peer-depends on `@trapi/metadata`
- Both presets depend on `@trapi/decorators`

## Package: `@trapi/metadata`

The core package. Analyzes TypeScript source files to extract decorator-based API metadata.

```
packages/metadata/src/
├── cache/          # Metadata caching for build performance
├── config/         # Configuration types and builders
├── decorator/      # Decorator analysis and property extraction
├── error/          # Custom error types
├── generator/      # Metadata generators
│   ├── abstract.ts # Base generator class
│   ├── controller/ # Controller-level generation
│   ├── metadata/   # Top-level metadata generation orchestration
│   ├── method/     # Method-level generation
│   ├── parameter/  # Parameter extraction
│   └── type.ts     # Type metadata generation
├── module.ts       # Module/file analysis
├── resolver/       # TypeScript compiler type resolution
├── type.ts         # Shared type definitions
└── utils/          # JSDoc, path, tsconfig, validation helpers
```

## Package: `@trapi/swagger`

Transforms normalized metadata into OpenAPI specifications.

```
packages/swagger/src/
├── config/         # Swagger generation configuration
├── constants.ts    # Document format constants
├── generator/
│   ├── abstract.ts # Base swagger generator
│   ├── module.ts   # Generator factory/entry
│   ├── v2/         # OpenAPI 2.0 (Swagger) generator
│   └── v3/         # OpenAPI 3.0 generator
├── metadata.ts     # Metadata integration
├── schema/         # Schema types and mappings
├── type.ts         # Shared type definitions
└── utils/          # Utility functions
```

## Package: `@trapi/decorators`

```
packages/decorators/src/
├── decorators/     # Decorator builder functions
├── module.ts       # Schema definition and exports
└── index.ts        # Re-exports decorators and schema
```

Exports decorator builder functions and a default schema mapping. The schema maps `DecoratorID` values to decorator names for metadata extraction.

## Package: Presets

`preset-typescript-rest` and `preset-decorators-express` map framework-specific decorators to TRAPI's internal `DecoratorID` enum. They allow TRAPI to work with existing decorator libraries without requiring code changes.
