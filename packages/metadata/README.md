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
import { Config } from '@trapi/decorator';
import { Cache } from '@trapi/metadata';

export type EntryPointConfig = {
    cwd: string,
    pattern: string
};

export type EntryPoint = string |
    string[] | 
    EntryPointConfig |
    EntryPointConfig[];

export interface Config {
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
     * Directory to store and cache metadata files.
     * Default: false
     */
    cache?: string | boolean | Partial<Cache.Config>;
    /**
     * Decorator config.
     * Default: {
     *      library: [], 
     *      internal: true,
     *      map: {}
     * }
     */
    decorator?: Config;
}
```

### Cache
The Cache can be configured by providing different kind of values:

- **boolean**:
  - `true`: Cache file will be saved to process.cwd() with generated hash file name and the cache will be cleared at a 10 percent chance.
  - `false`: Cache is disabled.
- **string** Cache will be saved to `value` directory with generated hash file name ...
- **object**:  obda
```typescript
export interface Config {
    /**
     * Specify if the cache driver should be enabled.
     * 
     * Default: false
     * */
    enabled?: boolean,
    /**
     * Directory relative or absolute path.
     * 
     * Default: process.cwd()
     */
    directoryPath?: string,
    /**
     * Specify the cache file name.
     * 
     * Default: metadata-{hash}.json
     */
    fileName?: string,
    
    /**
     * The cache file(s) will be cleared at a 10% percent change
     * each time.
     * 
     * Default: true
     */
    clearAtRandom?: boolean
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
import {createMetadata, Output} from "@trapi/metadata";
import * as path from "path";
import * as process from "process";

const metadata : Output = createMetadata({
        entryPoint: {
            cwd: path.join(process.cwd(), 'src', 'controllers'),
            pattern: '**/*.ts'
        },
        ignore: ['**/node_modules/**'],
        cache: {
            enabled: true,    
            directoryPath: path.join(process.cwd(), 'writable')
        },
        decorator: {
            internal: true,
            // Because both libaries does not have any decorator
            // names in common, the represnetation also does not differ and 
            // we can use them both :)
            library: ['decorators-express', 'typescript-rest']
        }
});

console.log(metadata);
// {controllers: [], referenceTypes: {}}

```

## Structure

**coming soon**

## License

Made with 💚

Published under [MIT License](./LICENSE).