# @trapi/metadata 📚

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fmetadata.svg)](https://badge.fury.io/js/@trapi%2Fmetadata)

This package is responsible for generating metadata information by analyzing TypeScript REST decorators (self defined or third-party libraries).
The metadata can than be used for generating a documentation according to the OpenAPI Specification or to create route schema/handling for libraries like: express, koa, etc.

Inspect the `CHANGELOG.md` in the repository for breaking changes.

**Table of Contents**

- [Installation](#installation)
- [Configuration](#configuration)
- [Limitations](#limitations)
- [Usage](#usage)
- [Structure](#structure)
- [License](#license)

## Installation

```bash
npm install --save @trapi/metadata
```

## Configuration

### Metadata
The metadata configuration object (Top-Level) is the main configuration object of this library
and can be defined according the following type scheme:

```typescript
import type {
    CacheOptions,
    DecoratorConfig,
    TsConfig,
} from "@trapi/metadata";

export type EntryPointOptions = {
    cwd: string,
    pattern: string
};

export type EntryPoint = string |
    string[] |
    EntryPointOptions |
    EntryPointOptions[];

export interface MetadataGenerateOptions {
    /**
     * The entry point to your API.
     */
    entryPoint: EntryPoint;

    /**
     * Directory to ignore during TypeScript files scan.
     * Default: []
     */
    ignore?: string[];

    /**
     * Directory to allow during TypeScript files scan.
     * Default: []
     */
    allow?: string[],

    /**
     * Directory to store and cache metadata files.
     * Default: false
     */
    cache?: string | boolean | Partial<CacheOptions>;

    /**
     * Manual decorator properties configuration.
     */
    decorators?: DecoratorConfig[],

    /**
     * Load a specific preset configuration.
     */
    preset?: string;

    /**
     * Path to tsconfig.json or a TsConfig object.
     */
    tsconfig?: string | TsConfig;
}
```

## Limitations

TRAPI's resolver explicitly handles these TypeScript utility types:

* `NonNullable`
* `Omit`
* `Partial`
* `Readonly`
* `Record`
* `Required`
* `Pick`

Additionally these are delegated to the TypeScript type checker and resolve through the compiler's own computation:

* `Extract`
* `Exclude`
* `ReturnType`
* `Parameters`
* `Awaited`
* `InstanceType`
* `ConstructorParameters`

## Usage

```typescript
import {
    generateMetadata,
    Metadata
} from "@trapi/metadata";
import path from "node:path";
import process from "node:process";

const metadata : Metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    ignore: ['**/node_modules/**'],
    cache: true,
    preset: '@trapi/decorators'
});

console.log(metadata);
// {controllers: [], referenceTypes: {}}

```

## Structure

The package follows a hexagonal layout:

```
src/
├── core/         # Domain types, port interfaces, generator contracts
│   ├── types/          # Metadata, Controller, Method, Parameter, Type, ...
│   ├── config/         # MetadataGenerateOptions, MetadataGeneratorOptions, EntryPoint
│   ├── decorator/      # DecoratorID enum, decorator config shapes
│   ├── error/          # MetadataError, GeneratorError, ResolverError
│   ├── metadata/       # IMetadataGenerator, IGeneratorContext
│   └── utils/          # Internal helpers (hasOwnProperty, normalizePath, …)
│
├── adapters/     # Infrastructure adapters
│   ├── typescript/     # TypeScript compiler API adapter (type resolver, JSDoc, AST)
│   ├── decorator/      # Decorator resolver + preset loader
│   ├── filesystem/     # Source file scanner, tsconfig loader
│   └── cache/          # Metadata cache
│
├── app/          # Orchestration / use-cases
│   ├── generate.ts     # generateMetadata()
│   └── generator/      # Controller, Method, Parameter generators
│
└── index.ts      # Public entry point
```

The dependency rule is strict: `core/` imports nothing from `adapters/` or `app/`, `adapters/` depends only on `core/`, and `app/` wires both together.

## License

Made with 💚

Published under [MIT License](./LICENSE).
