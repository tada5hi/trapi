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
import { 
    CacheOptions,
    DecoratorConfig 
} from "@trapi/metadata";

export type EntryPointOptions = {
    cwd: string,
    pattern: string
};

export type EntryPoint = string |
    string[] |
    EntryPointOptions |
    EntryPointOptions[];

export interface Options {
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
}
```

## Limitations
At the moment only the following TypeScript UtilityTypes are supported:
* NonNullable
* Omit
* Partial
* Readonly
* Record
* Required
* Pick

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
    preset: '@trapi/preset-routup'
});

console.log(metadata);
// {controllers: [], referenceTypes: {}}

```

## Structure

**coming soon**

## License

Made with 💚

Published under [MIT License](./LICENSE).
