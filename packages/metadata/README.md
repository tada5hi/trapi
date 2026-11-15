<p align="center"><img src="./assets/logo.svg" width="120" height="120" alt="TRAPI logo: the letter T inside a pair of generic type brackets"></p>
<h1 align="center">@trapi/metadata</h1>
<p align="center"><strong>Extract REST API metadata from decorated TypeScript controllers with the TypeScript compiler.</strong></p>
<p align="center">Stop maintaining a route list and JSON schemas next to your controllers. Routes, parameters, responses and every referenced type are read from the code you already have.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/metadata"><img src="https://img.shields.io/npm/v/%40trapi%2Fmetadata" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-trapimetadata">Why</a> · <a href="#installation">Installation</a> · <a href="#usage">Usage</a> · <a href="#configuration">Configuration</a> · <a href="#caching">Caching</a> · <a href="#limitations">Limitations</a> · <a href="#api">API</a></p>

---

## Why @trapi/metadata?

An OpenAPI document, a typed client or a route table all need the same facts: which classes are controllers, which methods are routes, where each parameter comes from and what every request and response type looks like. Those facts already live in your decorated TypeScript. Writing them down a second time means they drift.

`@trapi/metadata` reads them through the TypeScript compiler API and returns a plain, framework-neutral `Metadata` object (`controllers` plus `referenceTypes`). It never runs your code: decorators are matched by name in the AST, and types are resolved by the type checker.

| Concern | Without it | With `@trapi/metadata` |
| --- | --- | --- |
| Route discovery | Keep a route list in sync with every `@Get` and `@Controller` | Controllers, methods and parameters come from your decorators through a preset |
| Request and response types | Hand-written JSON schemas next to the interfaces they copy | The type checker resolves interfaces, generics, utility types, unions, tuples and enums into typed nodes; named types are stored once in `referenceTypes` |
| Framework vocabulary | The tool dictates its own annotation set | A preset maps your framework's decorator names; an inline `registry` covers your own decorators |
| Typos and unwired decorators | `@Hiden` is silently ignored | `strict: true` warns, `strict: 'throw'` fails the build, `onUnmatchedDecorator` hands you the reports |
| Repeat runs | Every run builds the TypeScript program and walks every controller again | A disk cache keyed on source text, compiler options, the resolved registry and the preset name |
| What you build on it | Output tied to one document format | Plain data with full TypeScript fidelity (a tuple stays a tuple), consumed by [`@trapi/swagger`](https://www.npmjs.com/package/@trapi/swagger) or your own generator |

Given this controller and `preset: '@trapi/preset-decorators-express'`, `generateMetadata()` returns the structure on the right (captured from the built package):

```typescript
import { Controller, Get, Params } from '@decorators/express';

interface User {
    id: string;
    name: string;
}

@Controller('/users')
export class UserController {
    private users = new Map<string, User>();

    @Get('/:id')
    getOne(@Params('id') id: string): User {
        return this.users.get(id);
    }
}
```

<p align="center"><img src="./assets/extract.svg" width="960" alt="generateMetadata reads UserController, decorated with @Controller('/users'), @Get('/:id') and @Path('id'), and returns Metadata. controllers[0] has name UserController, paths ['users'] and one method getOne with method get, path ':id', a path parameter id, a 200 response and the return type as a refObject named User. The User interface itself is stored once under referenceTypes."></p>

The express preset maps both `@Params('id')` and `@Path('id')` to a path parameter. Controller and method paths are normalised without their leading slash (`'users'`, `':id'`), and a response or parameter that uses a named type carries the full resolved node, with the same node also stored under its name in `referenceTypes`.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Generate OpenAPI from the metadata](#generate-openapi-from-the-metadata)
  - [Handle errors](#handle-errors)
- [Configuration](#configuration)
  - [Options](#options)
  - [Entry points, ignore and allow](#entry-points-ignore-and-allow)
  - [tsconfig](#tsconfig)
  - [Presets and inline registries](#presets-and-inline-registries)
  - [Strict mode](#strict-mode)
- [How extraction works](#how-extraction-works)
  - [Controllers and multiple mounts](#controllers-and-multiple-mounts)
  - [Inherited route methods](#inherited-route-methods)
  - [Parameters](#parameters)
  - [Responses](#responses)
  - [Type resolution](#type-resolution)
- [Caching](#caching)
- [Limitations](#limitations)
- [Errors](#errors)
- [API](#api)
- [Structure](#structure)
- [Notes](#notes)
- [License](#license)

## Installation

```bash
npm install --save @trapi/metadata @trapi/core
```

- **ESM only.** The package ships `dist/index.mjs` with an `import` export; there is no CommonJS build.
- **`typescript` is a peer dependency** (`>=5.0.0`). The compiler you install is the one that reads your code.
- **`@trapi/core`** is a dependency, but `@trapi/metadata` does not re-export it. Install it next to this package to import the `Metadata` type, the type guards and the handler builders (`createRegistry`, `method`, ...).
- **A preset** maps decorator names to handlers. Install the one for your framework, for example `@trapi/preset-decorators-express` or `@trapi/preset-typescript-rest`, or pass your own.

Inspect the `CHANGELOG.md` in the repository for breaking changes.

## Usage

```typescript
import type { Metadata } from '@trapi/core';
import { generateMetadata } from '@trapi/metadata';

const metadata: Metadata = await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
    tsconfig: './tsconfig.json',
});

console.log(metadata);
// { controllers: [ ... ], referenceTypes: { ... } }
```

`generateMetadata()` runs these steps:

1. Loads `tsconfig` (when given) and expands `entryPoint` into a file list.
2. Builds a TypeScript program from those files. Every file the program pulls in through imports is walked too, unless `ignore` excludes it.
3. Loads the preset and the inline `registry` into one handler registry.
4. Computes the cache key and returns the cached result on a hit (see [Caching](#caching)).
5. On a miss, runs the controller, method and parameter generators over every named class and resolves each type with `TypeNodeResolver`.
6. Reports unmatched decorators when `strict` or `onUnmatchedDecorator` is set.

### Generate OpenAPI from the metadata

`@trapi/swagger` takes the `Metadata` object as it is. Extract once and emit as many documents as you need:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
});

const v3 = await generateSwagger({ version: 'v3', metadata });
const v2 = await generateSwagger({ version: 'v2', metadata });

await saveSwagger(v3, { cwd: './docs', format: 'yaml' });
```

The metadata is not limited to OpenAPI. It is meant as an intermediate representation for route generators, validation libraries and other tools, so nothing TypeScript-specific is collapsed to fit OpenAPI at this stage.

### Handle errors

The error classes of this package extend `MetadataError` and, except for `ResolverError`, carry a `code`; preset loading fails with a `CoreError` from `@trapi/core`. Parameter problems are wrapped in a `GeneratorError` with code `GENERATOR_PARAMETER_GENERATION_FAILED`, which names the controller, method and argument index and keeps the original error as `cause`.

```typescript
import { GeneratorErrorCode, generateMetadata, isGeneratorError, isResolverError } from '@trapi/metadata';

try {
    await generateMetadata({
        entryPoint: 'src/controllers/**/*.ts',
        preset: '@trapi/preset-decorators-express',
        strict: 'throw',
    });
} catch (error) {
    if (isGeneratorError(error) && error.code === GeneratorErrorCode.STRICT_UNMATCHED_DECORATORS) {
        console.error(error.message);
    } else if (isResolverError(error)) {
        console.error(`cannot resolve a type at ${error.file}:${error.line}`);
    }

    throw error;
}
```

All codes are listed under [Errors](#errors).

## Configuration

`generateMetadata()` takes one `MetadataGenerateOptions` object. Only `entryPoint` is required.

```typescript
import type { Preset, Registry, UnmatchedDecoratorReport } from '@trapi/core';
import type { CacheOptions, TsConfig } from '@trapi/metadata';

type EntryPointOptions = {
    cwd: string,
    pattern: string,
};

type EntryPoint = string | string[] | EntryPointOptions | EntryPointOptions[];

type MetadataGenerateOptions = {
    entryPoint: EntryPoint;
    ignore?: string[];
    allow?: string[];
    cache?: string | boolean | Partial<CacheOptions>;
    preset?: string | Preset;
    registry?: Registry;
    strict?: boolean | 'throw';
    onUnmatchedDecorator?: (reports: UnmatchedDecoratorReport[]) => void;
    tsconfig?: string | TsConfig;
};
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `entryPoint` | `EntryPoint` | required | Glob patterns, or `{ cwd, pattern }` objects, for the files to analyse. |
| `ignore` | `string[]` | none | Glob patterns (minimatch) tested against the absolute path of every file in the TypeScript program. A matching file is not walked and not hashed for the cache. |
| `allow` | `string[]` | none | Glob patterns that re-admit files matched by `ignore`. They do not restrict anything on their own. |
| `cache` | `string \| boolean \| Partial<CacheOptions>` | enabled in `os.tmpdir()` | `false` turns the cache off. A string is the cache directory. See [Caching](#caching). |
| `preset` | `string \| Preset` | none | Package name, `./relative` or absolute path, `module:` specifier, or an inline `Preset` object. |
| `registry` | `Registry` | none | Extra handlers, appended after the preset's. |
| `strict` | `boolean \| 'throw'` | `false` | Report decorators that no handler matched: `true` warns, `'throw'` throws. |
| `onUnmatchedDecorator` | `(reports) => void` | none | Receives the unmatched-decorator reports instead of the warning or error. |
| `tsconfig` | `string \| TsConfig` | none | Path to a `tsconfig.json`, or an inline object with `compilerOptions`. |

Without `preset` and `registry`, no handler matches anything. When files were scanned but no controller was found, `generateMetadata()` throws a `ConfigError` with code `CONFIG_PRESET_MISSING`.

### Entry points, ignore and allow

```typescript
// a single glob
entryPoint: 'src/controllers/**/*.ts'

// several globs
entryPoint: ['src/controllers/**/*.ts', 'src/routes/**/*.ts']

// a glob relative to another directory
entryPoint: { cwd: 'packages/api', pattern: 'src/**/*.controller.ts' }
```

The TypeScript program contains the entry files and everything they import, including declaration files from `node_modules`. `ignore` and `allow` filter that whole set, so a pattern has to match absolute paths:

```typescript
await generateMetadata({
    entryPoint: 'src/**/*.ts',
    preset: '@trapi/preset-decorators-express',
    ignore: ['**/*.spec.ts', '**/legacy/**'],
    allow: ['**/legacy/health.controller.ts'],
});
```

### tsconfig

```typescript
// a path, parsed with TypeScript's own config parser (extends chains and paths resolve as under tsc)
tsconfig: './tsconfig.json'

// an inline object
tsconfig: {
    compilerOptions: {
        experimentalDecorators: true,
    },
}
```

A relative path resolves against `process.cwd()`. If the file cannot be read or is not a JSON object, generation does not fail: it continues with TypeScript's default compiler options, as it does when `tsconfig` is omitted. Point it at the configuration you compile with, so `paths` and the decorator settings match your build.

### Presets and inline registries

A preset is a set of handlers keyed by decorator name. `@trapi/preset-decorators-express` maps `@Controller`, `@Get`, `@Body`, `@Path`, `@Query`, `@Request` and the TRAPI markers (`@Hidden`, `@Tags`, `@IsInt`, ...); `@trapi/preset-typescript-rest` maps `@Path`, `@GET`, `@QueryParam` and friends.

<p align="center"><img src="./assets/handlers.svg" width="960" alt="The preset option, a package name, a relative path, a module: specifier or an inline Preset object, is loaded into a Registry after its extends chain and replaces rules are resolved. An inline registry, built with createRegistry, is appended after it by mergeRegistries. On each class, method and parameter, matching decorator handlers run first, then JSDoc handlers, then, for classes and methods, the finalizers. Inline handlers run last, so they win scalar writes and add to appended fields."></p>

A string preset is resolved by `resolvePresetByName` from `@trapi/core`: it loads the module and takes its `preset` export, then its default export, then the module itself. A bare name without a scope is also tried as `@trapi/<name>`. The preset's `extends` chain and `replaces` rules are resolved by `loadRegistry`.

Pass `registry` for a few handlers of your own, without writing a full preset. This one teaches the generator a `@Status(202)` decorator:

```typescript
import { createRegistry, method, readNumber } from '@trapi/core';
import { generateMetadata } from '@trapi/metadata';

const metadata = await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
    registry: createRegistry({
        methods: [
            method({
                match: { name: 'Status', on: 'method' },
                apply: (ctx, draft) => {
                    const status = readNumber(ctx.argument(0));

                    if (status !== undefined) {
                        draft.successStatus = String(status);
                    }
                },
            }),
        ],
    }),
});
```

- **Order.** The preset's handlers come first and the inline registry's after them. Inline handlers therefore win scalar writes (such as `into('path')`) and add to list fields (such as `append('tags')`).
- **No `replaces` inline.** `replaces` is applied when a preset is loaded. To remove a preset handler, write a `Preset` that `extends` it with `replaces` and pass that as `preset`.
- **Per node**, decorator handlers run before JSDoc handlers, so a JSDoc tag such as `/** @hidden */` acts as an override. Controller and method finalizers (`finalizeController`, `finalizeMethod` on a preset) run after both.

The full handler API is described in [Decorators & Presets](https://trapi.tada5hi.net/guide/metadata-decorators) and [Custom Presets](https://trapi.tada5hi.net/guide/advanced-custom-presets).

### Strict mode

<p align="center"><img src="./assets/strict.svg" width="960" alt="@Hiden() is a typo with no handler in the preset. With strict unset it is silently ignored. strict: true prints one console.warn after generation listing each unmatched decorator with its target, host and file location. strict: 'throw' throws a GeneratorError with code GENERATOR_STRICT_UNMATCHED_DECORATORS. onUnmatchedDecorator receives the reports instead, with no warning and no throw. JSDoc tags are never reported, and any of these settings bypasses the metadata cache."></p>

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
    onUnmatchedDecorator: (reports) => {
        for (const report of reports) {
            console.error(`unmatched @${report.name} on ${report.target} ${report.host.name} (${report.file}:${report.line})`);
        }
    },
});
```

- `strict: true` prints one `console.warn` at the end of the run. Repeated occurrences of the same decorator on the same kind of target are folded into one line with a count.
- `strict: 'throw'` throws a `GeneratorError` with code `GENERATOR_STRICT_UNMATCHED_DECORATORS` and the same text. Use it as a CI gate.
- `onUnmatchedDecorator` turns collection on by itself and replaces both: no warning, no throw.
- Decorators are checked on every named class in the program and on the methods and parameters of controllers. JSDoc tags are not reported, because standard tags such as `@param` would drown the report.
- Any of these settings bypasses the cache, because a cache hit would skip the handler run that produces the reports.

## How extraction works

### Controllers and multiple mounts

A class is a controller when a controller handler sets `draft.paths`, which the `@Controller` handler of the express preset does. That handler takes one path or an array of paths:

<p align="center"><img src="./assets/mounts.svg" width="960" alt="@Controller(['/roles', '/realms/:realmId/roles']) produces paths ['roles', 'realms/:realmId/roles']. A path parameter is checked against every controller path joined with the method path: @Path('realmId') on byRealm is accepted because /realms/:realmId/roles/by-realm contains it, even though /roles/by-realm does not. @Path('tenantId') matches no combination and throws GENERATOR_PARAMETER_GENERATION_FAILED."></p>

- `Controller.paths` is always a non-empty array. Paths are normalised and duplicates removed, so `@Controller(['/roles', '/roles'])` yields one entry.
- Method paths stay a single string. `@trapi/swagger` emits one OpenAPI path per `controller path × method path` combination.
- A path parameter (`:name` or `{name}`) is valid when it appears in **at least one** combination. Otherwise the parameter generator throws `PARAMETER_PATH_MISMATCH`, wrapped in `GENERATOR_PARAMETER_GENERATION_FAILED`.
- A method becomes a route only when a handler sets its HTTP verb. A method marked hidden (for example with `@Hidden()`) is left out of the metadata.

### Inherited route methods

<p align="center"><img src="./assets/inheritance.svg" width="960" alt="ProjectController extends CrudController. Its own getOne with path by-slug/:id is collected first; the base getOne is skipped because the name is already taken, and the base remove method with path :id is inherited. The extends chain is walked recursively and import aliases are followed. CrudController has no @Controller decorator, so it is not a controller itself. An inherited method that fails with a ResolverError or GENERATOR_PARAMETER_GENERATION_FAILED is skipped; other errors still throw."></p>

- The controller's own route methods are collected first, then the methods of each `extends` base class, recursively. Import aliases are followed to the base declaration.
- A method name that already produced a route is skipped, so a decorated override wins.
- An inherited method whose type or parameters cannot be resolved (a `ResolverError` or `GENERATOR_PARAMETER_GENERATION_FAILED`) is skipped instead of failing the run. Any other error is thrown.

### Parameters

<p align="center"><img src="./assets/parameters.svg" width="960" alt="An object-typed @Query() filter: UserFilter decomposes into one queryProp per property: name (string, required: false) and limit (double, required: true); UserFilter is stored in referenceTypes. A named scalar @Query('sort') sort: string becomes queryProp sort. A @Request() context parameter produces no parameter and its type is never resolved, so ExpressRequest does not reach referenceTypes. An undecorated argument such as create(data: UserCreate) defaults to body; on head or options that throws. in: 'query' never reaches Metadata."></p>

- **`query` is an input marker.** A `@Query()` of an object type is decomposed into one `queryProp` parameter per property. Every other supported query type (a scalar, an array of scalars, an enum, a union) becomes a single `queryProp`. `in: 'query'` is never part of the output, because neither OpenAPI emitter could express it.
- **`path` of an object type** is decomposed the same way, and each property must appear in the path.
- **Context parameters** (`@Request()`, `@Response()`, `@Next()` in the express preset) produce no parameter, and their type is never resolved, so a framework's request type does not end up in `referenceTypes`.
- **No matching handler** means `body`. That is accepted on `get`, `post`, `put`, `patch` and `delete`; on any other verb the parameter generator throws `PARAMETER_METHOD_UNSUPPORTED`.
- `required` is `true` unless the argument is optional (`?`) or has an initializer. The initializer becomes `default`. A JSDoc comment on the argument becomes `description`, and `/** @deprecated */` marks it deprecated.
- `@example` tags on the method whose text starts with the argument name (`@example filter {"limit": 10}`) become the parameter's `examples`; the value must be JSON.
- Validator tags on the method (`@minLength`, `@maxLength`, `@minimum`, `@maximum`, `@minItems`, `@maxItems`, `@minDate`, `@maxDate`, `@pattern`, `@uniqueItems`, followed by the argument name and the value) become `validators`.
- One `body` parameter per method (`GENERATOR_BODY_PARAMETER_DUPLICATE`), and no `body` or `bodyProp` together with form parameters (`GENERATOR_BODY_FORM_CONFLICT`).

### Responses

<p align="center"><img src="./assets/responses.svg" width="960" alt="A method returning Run gets a 200 Ok response with schema Run. A void method gets 204 No content with a void schema. With an explicit success status of 202 the response is 202 Accepted with the unwrapped Promise&lt;Run&gt; as schema. An explicit 204, 205 or 304 documents no schema at all, whatever the return type. The success status comes from a handler that sets draft.successStatus; a value that is not a three-digit code throws."></p>

- The return type (with `Promise` unwrapped; inferred when there is no annotation) is documented under `200` with description `Ok`, or `204` `No content` for `void`.
- A handler can set `draft.successStatus` (the `@Status` handler from [Presets and inline registries](#presets-and-inline-registries) does). The response then uses that status and its reason phrase (`201` `Created`, `202` `Accepted`, ...). A value that is not a three-digit code throws `GENERATOR_SUCCESS_STATUS_INVALID`.
- An explicit `204`, `205` or `304` documents no schema at all. A `void` method without an explicit status keeps its `void` schema under `204`.
- Responses declared by handlers (for example `@Description(400, 'Bad request')`) come first. If one already uses the default status, no extra response is added; with an explicit `successStatus`, the return type fills its schema when it has none.

### Type resolution

<p align="center"><img src="./assets/types.svg" width="960" alt="Properties of the Stats interface resolve as follows. number becomes double. A number tagged with the @isInt JSDoc tag, or decorated with a handler that carries a numeric marker, becomes integer. A named tuple becomes a tuple node with its element names. Partial&lt;User&gt; becomes an inline nestedObjectLiteral whose properties are all required: false. A union of string literals becomes a union of single-member enums. The enum Role becomes a refEnum and is stored in referenceTypes."></p>

- `number` resolves to `double`. `@IsInt`, `@IsLong`, `@IsFloat`, `@IsDouble` and the JSDoc tags `@isInt`, `@isLong`, `@isFloat`, `@isDouble` narrow it to `integer`, `long`, `float` or `double`. The resolver finds them through the handlers' `numeric` markers, so a preset that renames them keeps working.
- Interfaces and classes become `refObject`, type aliases `refAlias`, enums `refEnum`, each stored once in `referenceTypes` under its name. Inline object types become `nestedObjectLiteral`.
- Tuples stay `tuple` with their element names, intersections stay `intersection`; conversions that OpenAPI forces happen in `@trapi/swagger`, never here.
- Generic type arguments are substituted before the node is emitted: a `Page<User>` return type becomes a `refObject` named `PageUser` whose `items` hold `User` nodes.

The full table, including dates, buffers, nullable types and circular references, is in [Supported TypeScript Types](https://trapi.tada5hi.net/guide/advanced-type-support).

## Caching

<p align="center"><img src="./assets/cache.svg" width="960" alt="The cache key is a sha256 over five parts: CACHE_SCHEMA_VERSION, the path and full text of every non-ignored source file, the compiler options as stable JSON, the resolved registry (handler match, marker, replaces and apply source, plus finalizers) and the preset name. The file .trapi-metadata-&lt;cacheKey&gt;.json lives in directoryPath, os.tmpdir() by default, is written to a temporary file and renamed into place, and files older than maxAgeMs, 7 days by default, are deleted after a save. On a hit the stored Metadata is returned if cacheKey and schemaVersion match; on a miss every generator runs and the result is saved. strict or onUnmatchedDecorator bypass the cache for reading and writing. The cache is on unless cache is false."></p>

The cache is **on by default**: leaving `cache` out stores results in `os.tmpdir()`. Turn it off with `cache: false`.

```typescript
cache: false                                  // off
cache: true                                   // on, in os.tmpdir()
cache: '.cache/trapi'                         // on, in this directory (relative to process.cwd())
cache: { directoryPath: '.cache/trapi', maxAgeMs: 24 * 60 * 60 * 1000 }
```

| `CacheOptions` field | Type | Default | Description |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | `false` disables reading and writing. |
| `directoryPath` | `string` | `os.tmpdir()` | Created on the first save. A relative path resolves against `process.cwd()`. |
| `fileName` | `string` | `.trapi-metadata-<cacheKey>.json` | A fixed name turns the cache into a single slot; the key stored in the file still has to match. |
| `maxAgeMs` | `number` | `604800000` (7 days) | After each save, cache files older than this are deleted. `0` disables eviction; a negative or non-finite value falls back to the default. |

- **The key** is a sha256 over `CACHE_SCHEMA_VERSION`, the path and full text of every non-ignored source file, the compiler options, the resolved registry (each handler's `match`, `marker`, `replaces` and `apply` source, plus finalizers) and the preset name. Any edit to a source file, `tsconfig` or preset produces a new key.
- **A hit** still builds the TypeScript program, hashes the sources and loads the preset; it skips the controller and type-resolution work.
- **The file** is checked on read: `cacheKey` and `schemaVersion` must match, and a corrupt file is deleted. Writes go to a temporary file that is renamed into place, so parallel runs never read a half-written file.
- **`strict` and `onUnmatchedDecorator` bypass the cache** for reading and writing.
- **Not tracked:** a change inside a handler that only shifts a captured variable (a factory-built handler with the same source text) does not change the key. Delete the cache directory or set `cache: false` after such a change.

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

Other utility types may resolve through the same fallback, but are not guaranteed to.

The generators also reject or skip these shapes:

- **Destructured parameters** (`getOne({ id }: Params)`) are rejected; use a plain identifier.
- **Query parameter types** are limited to scalars (`string`, the number kinds, `boolean`, dates, `Buffer`), enums, unions, objects (which are decomposed) and arrays of scalars. Anything else, including an array of a named enum (`Role[]`), throws `PARAMETER_TYPE_UNSUPPORTED`. An array query parameter defaults to `collectionFormat: 'multi'`.
- **Generic base classes:** an inherited method is resolved from the base declaration, so a class type parameter is not replaced by the subclass's type argument. `getMany(): T[]` inherited through `extends CrudController<Entity>` resolves to an array of `any`.
- **Decorator arguments** are read statically from the AST. A value computed at runtime cannot be read.

## Errors

| Error | Code | Thrown when |
| --- | --- | --- |
| `ConfigError` | `CONFIG_PRESET_MISSING` | Files were scanned, no controller was found and neither `preset` nor `registry` is set. |
| `ConfigError` | `CONFIG_TSCONFIG_MALFORMED` | `loadTSConfig()` reads a file that is not a JSON object. `generateMetadata()` catches it and continues with default compiler options. |
| `GeneratorError` | `GENERATOR_PARAMETER_GENERATION_FAILED` | Any parameter error; the original error is the `cause`. |
| `GeneratorError` | `GENERATOR_BODY_PARAMETER_DUPLICATE` | A method has more than one body parameter. |
| `GeneratorError` | `GENERATOR_BODY_FORM_CONFLICT` | A method mixes `body`/`bodyProp` with form parameters. |
| `GeneratorError` | `GENERATOR_STRICT_UNMATCHED_DECORATORS` | `strict: 'throw'` found decorators without a handler. |
| `GeneratorError` | `GENERATOR_SUCCESS_STATUS_INVALID` | `draft.successStatus` is not a three-digit status code. |
| `GeneratorError` | `GENERATOR_CONTROLLER_NO_SOURCE_FILE`, `GENERATOR_CONTROLLER_NO_NAME` | A controller node has no source file or no name. |
| `ParameterError` | `PARAMETER_PATH_MISMATCH` | A path parameter appears in no mount path. |
| `ParameterError` | `PARAMETER_TYPE_UNSUPPORTED` | A query parameter has a type that cannot be a query value. |
| `ParameterError` | `PARAMETER_METHOD_UNSUPPORTED` | A body parameter on a verb other than `get`, `post`, `put`, `patch`, `delete`. |
| `ParameterError` | `PARAMETER_INVALID_EXAMPLE` | A parameter `@example` is not valid JSON. |
| `ValidatorError` | `VALIDATOR_EXPECTED_NUMBER`, `VALIDATOR_EXPECTED_DATE`, `VALIDATOR_EXPECTED_STRING` | A validator tag has a value of the wrong kind. |
| `ResolverError` | none | A type cannot be resolved. `file` and `line` point at the node. |
| `CoreError` (from `@trapi/core`) | `PRESET_NOT_FOUND`, `PRESET_INVALID`, `PRESET_CYCLE`, `PRESET_REPLACES_NO_MATCH` | The preset cannot be found, loaded or validated, or its `extends` chain is broken. |

All errors of this package extend `MetadataError`. `isGeneratorError()` and `isResolverError()` narrow an unknown error.

## API

The stable public surface is documented in the [API Reference](https://trapi.tada5hi.net/guide/metadata-api-reference). Anything not listed there should be treated as internal even if it is re-exported, and may change without a major version bump.

| Export | Kind | Purpose |
| --- | --- | --- |
| `generateMetadata(options)` | function | Extract `Metadata` from TypeScript source. |
| `MetadataGenerateOptions`, `MetadataGeneratorOptions`, `EntryPoint`, `EntryPointOptions` | types | The options above. |
| `CacheOptions`, `CacheOptionsInput` | types | Cache settings. |
| `TsConfig`, `loadTSConfig()`, `softLoadTsconfig()` | type, functions | Read a `tsconfig.json`; the soft variant returns `{}` on failure. |
| `scanSourceFiles(entryPoint)` | function | Expand an `EntryPoint` into absolute file paths. |
| `MetadataError`, `ConfigError`, `GeneratorError`, `ParameterError`, `ResolverError`, `ValidatorError` | classes | Errors, see [Errors](#errors). |
| `ConfigErrorCode`, `GeneratorErrorCode`, `ParameterErrorCode`, `ValidatorErrorCode` | constants | Error codes. |
| `isGeneratorError()`, `isResolverError()` | functions | Error type guards. |
| `applyDecoratorHandlers()`, `applyJsDocHandlers()`, `buildDecoratorSources()`, `buildJsDocSources()`, `readNodeDecorators()` | functions | Low-level decorator orchestration on a TypeScript node, for custom generators and tests. |
| `MetadataGenerator`, `ControllerGenerator`, `MethodGenerator`, `ParameterGenerator`, `TypeNodeResolver` | classes | Internals, exported for extension. Not part of the stable surface. |
| `CacheClient`, `composeCacheKey()`, `hashRegistry()`, `hashCompilerOptions()`, `CACHE_SCHEMA_VERSION` | class, functions, constant | Cache internals. Not part of the stable surface. |

`Metadata`, `Controller`, `Method`, `Parameter`, the `Type` union, the type guards and the handler builders live in `@trapi/core`.

## Structure

The package follows a hexagonal layout:

```
src/
├── core/         # TypeScript-coupled contracts
│   ├── config/         # MetadataGenerateOptions, MetadataGeneratorOptions, EntryPoint
│   ├── metadata/       # IMetadataGenerator, IGeneratorContext, IResolverContext, IReferenceTypeRegistry
│   ├── error/          # MetadataError, ConfigError, GeneratorError, ParameterError, ResolverError, ValidatorError
│   └── utils/          # Internal helpers (hasOwnProperty, normalizePath, …)
│
├── adapters/     # Infrastructure adapters
│   ├── typescript/     # TypeNodeResolver and sub-resolvers, JSDoc, AST helpers, validators
│   ├── decorator/      # Handler orchestrator + decorator/JSDoc source extraction
│   ├── filesystem/     # Source file scanner, tsconfig loader
│   └── cache/          # CacheClient, cache key composition
│
├── app/          # Orchestration / use-cases
│   ├── generate.ts     # generateMetadata()
│   └── generator/      # Metadata, Controller, Method, Parameter generators
│
└── index.ts      # Public entry point
```

Framework-neutral domain types and the preset machinery live in `@trapi/core`. The dependency rule is strict: `core/` imports nothing from `adapters/` or `app/`, `adapters/` depends only on `core/` and `@trapi/core`, and `app/` wires both together.

## Notes

- **The cache is on unless you turn it off.** Omitting `cache` writes to `os.tmpdir()`. Use `cache: false` for builds that must always re-extract.
- **A broken `tsconfig` path is not an error.** Generation continues with default compiler options, which can change how decorators, `paths` and types resolve.
- **Every named class in the program is a candidate**, including classes in imported files. Use `ignore` to keep imported code out of the walk and out of the cache key.
- **Hiding an override does not hide the inherited route.** A subclass method marked `@Hidden()` produces no route, so its name is not taken, and the base class's decorated method of the same name is still inherited.
- **Metadata keeps TypeScript detail.** Tuples, intersections and `never` reach the output as their own nodes; lossy conversions happen in `@trapi/swagger`.

## License

Made with 💚

Published under [MIT License](./LICENSE).
