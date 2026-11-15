<p align="center"><img src="./assets/logo.svg" width="120" height="120" alt="TRAPI logo: the letter T inside a pair of generic type brackets"></p>
<h1 align="center">@trapi/preset-decorators-express</h1>
<p align="center"><strong>A TRAPI preset that reads @decorators/express controllers into API metadata and OpenAPI documents.</strong></p>
<p align="center">Keep writing <code>@Controller</code>, <code>@Get</code> and <code>@Body</code> for your Express app. This preset tells TRAPI what each of them means, so you write no handler code and no second route description.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/preset-decorators-express"><img src="https://img.shields.io/npm/v/%40trapi%2Fpreset-decorators-express" alt="npm version"></a>
  <a href="https://github.com/tada5hi/trapi/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-this-preset">Why</a> · <a href="#installation">Installation</a> · <a href="#usage">Usage</a> · <a href="#parameters">Parameters</a> · <a href="#decorator-reference">Reference</a> · <a href="#extending-the-preset">Extending</a> · <a href="#notes">Notes</a></p>

---

## Why this preset?

[TRAPI](https://github.com/tada5hi/trapi) reads decorated TypeScript at build time, but it does not assume any decorator names. A **preset** is the table that says "`@Get('/:id')` on a method means verb `get`, path `:id`". This package is that table for [@decorators/express](https://www.npmjs.com/package/@decorators/express), plus the TRAPI marker decorators and JSDoc tags you need for documentation-only facts (tags, security, response descriptions, number formats).

| Concern | Without this preset | With this preset |
| --- | --- | --- |
| Routing vocabulary | Write a handler for `@Controller`, every verb and every parameter binder yourself | `@Controller`, `@Mount`, `@Get` … `@All`, `@Body`, `@Query`, `@Params`, `@Headers`, `@Cookies` are mapped |
| Express request objects | `@Request()`, `@Response()`, `@Next()` and bulk `@Headers()` would need special-casing, or their types leak into the schemas | They become context parameters: never emitted, and their types are never resolved |
| Documentation-only facts | Maintain them next to the code in a separate OpenAPI file | `@Tags`, `@Security`, `@Description`, `@Example`, `@Extension`, `@Produces`, `@Consumes`/`@Accept`, `@Hidden`, `@Deprecated`, `@IsInt` … and JSDoc tags |
| Install footprint | Your preset code depends on whatever you wire up | One default export, peer-depends on `@trapi/core` only, extends no other preset |

The preset only maps names. Your application still installs and runs `@decorators/express`; TRAPI never imports it and never registers a route.

```typescript
import { Controller, Get, Post, Body, Params, Query } from '@decorators/express';
import { Tags, Security, Description } from './decorators'; // TRAPI markers, see below

@Tags('user')
@Controller('/users')
export class UserController {
    @Get('/')
    @Security(['user:read'], 'oauth2')
    list(@Query('page') page: number): User[] { /* … */ }

    @Get('/:id')
    get(@Params('id') id: string): User { /* … */ }

    @Post('/')
    @Description<User>(201, 'Created')
    create(@Body() data: UserCreate): User { /* … */ }
}
```

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
});

const document = await generateSwagger({ version: 'v3.1', metadata });
```

<p align="center"><img src="./assets/pde-controller-metadata.svg" width="960" alt="UserController carries @Tags('user') and @Controller with two mount paths. Its list method is decorated with @Get('/'), and its parameters with @Query('page'), @Headers('x-request-id'), @Request() and @Response(). The preset produces a Controller with paths users and realms/:realmId/users and tags user, and a Method list with method get, path empty, a queryProp parameter page of type double and a header parameter x-request-id of type string. The @Request and @Response parameters become context and are not emitted."></p>

That picture is real `generateMetadata` output for the controller on the left. Paths are stored without their leading slash (`'/'` becomes `''`), a named `@Query` becomes a `queryProp`, a plain `number` resolves to `double`, and the two context parameters are gone before their types are resolved.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Marker decorators](#marker-decorators)
- [Parameters](#parameters)
- [Multiple mount paths](#multiple-mount-paths)
- [Markers and JSDoc tags](#markers-and-jsdoc-tags)
- [Responses, security and examples](#responses-security-and-examples)
- [Decorator reference](#decorator-reference)
- [Extending the preset](#extending-the-preset)
- [Notes](#notes)
- [Documentation](#documentation)
- [License](#license)

## Installation

```bash
npm install @trapi/preset-decorators-express --save-dev
```

You also need `@trapi/metadata` (it runs the TypeScript compiler and applies the preset), and `@trapi/swagger` or `@trapi/cli` if you want an OpenAPI document. The preset declares `@trapi/core` as a peer dependency; npm 7 and later install it for you.

The package is ESM only (`import`, no `require`). It ships the preset as its default export and as the named export `preset`.

Inspect the `CHANGELOG.md` in the repository for breaking changes.

## Usage

Reference the preset by name when generating metadata:

```typescript
import { generateMetadata } from '@trapi/metadata';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
});
```

A name without a scope is also tried with `@trapi/` in front, so `preset: 'preset-decorators-express'` works too. You can pass the imported object instead of the name:

```typescript
import { generateMetadata } from '@trapi/metadata';
import preset from '@trapi/preset-decorators-express';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset,
    strict: true, // warn about decorators no handler matched, e.g. a typo like @Hiden
});
```

With the CLI, the same preset is a flag:

```bash
npx trapi generate \
  --preset @trapi/preset-decorators-express \
  --entry-point 'src/**/*.ts' \
  --output docs/openapi.json \
  --version 3.1
```

### Marker decorators

`@decorators/express` has no `@Tags`, `@Security`, `@Hidden` or `@IsInt`. TRAPI reads decorators from the source, not at runtime, so the markers only need to exist and type-check. Define them once as no-op functions in your project:

```typescript
// src/decorators.ts
const marker = (..._args: unknown[]) => (..._target: unknown[]): void => {};

export const Tags = marker;
export const Hidden = marker;
export const Deprecated = marker;
export const Security = marker;
export const Extension = marker;
export const Produces = marker;
export const Consumes = marker;
export const IsInt = marker;

// Generic, so you can write @Description<User>(201, 'Created').
export function Description<T = unknown>(status?: number | string, description?: string, example?: T) {
    return marker(status, description, example);
}

export function Example<T = unknown>(payload: T, label?: string) {
    return marker(payload, label);
}
```

The preset matches decorators **by name only**, wherever they are imported from. A complete set is in [`examples/decorators`](https://github.com/tada5hi/trapi/tree/master/examples/decorators).

## Parameters

<p align="center"><img src="./assets/pde-parameter-map.svg" width="960" alt="With a name argument, @Body becomes bodyProp, @Query becomes queryProp, @Params becomes path, @Headers becomes header and @Cookies becomes cookie. Without an argument, @Body becomes body and @Query becomes query, which is split into one queryProp per property of its type, while @Params, @Headers and @Cookies bind the whole object and become context. @Request, @Response and @Next always become context, and context parameters are not emitted."></p>

The first argument decides the kind. It is read as a string literal or as a constant the compiler can resolve.

- **`@Body()`** is the whole request body (`body`). **`@Body('note')`** is one property of it (`bodyProp`); several of them are merged into one body schema by the emitter.
- **`@Query()`** binds the whole query object. Its type is split into one `queryProp` per property, so `@Query() filter: { q: string; limit?: number }` documents `q` and `limit`. **`@Query('page')`** is one query parameter.
- **`@Params('id')`**, **`@Headers('x-request-id')`** and **`@Cookies('session')`** produce `path`, `header` and `cookie` parameters. Without a name they bind the whole `req.params`, `req.headers` or `req.cookies` object, which OpenAPI cannot express as one parameter, so they become `context`.
- **`@Request()`**, **`@Response()`** and **`@Next()`** are always `context`, whatever their argument. A context parameter is not emitted, and its type is never resolved, so a large framework type such as Express's `Request` does not end up in the document's schemas.

The preset also maps parameter names that `@decorators/express` does not export, for code that mixes decorator sets: `@BodyProp`, `@QueryProp`, `@Path`, `@PathParam`, `@Param`, `@Header`, `@Cookie`, and the form binders `@Form`, `@FormProp`, `@File`, `@Files` (all `formData`). See the [parameter reference](#parameter-decorators).

## Multiple mount paths

`@Controller` and `@Mount` on a class accept a string or an array of strings. Every entry becomes one element of `Controller.paths`, and the emitter writes each method once per mount:

```typescript
@Controller(['/roles', '/realms/:realmId/roles'])
export class RoleController {
    @Get('/')
    list(): Role[] { /* … */ }

    @Get('/:id')
    get(@Params('id') id: string): Role { /* … */ }
}
```

<p align="center"><img src="./assets/pde-multi-mount.svg" width="960" alt="@Controller(['/roles', '/realms/:realmId/roles']) on RoleController with @Get('/') list and @Get('/:id') get produces four OpenAPI operations: GET /roles (List), GET /realms/{realmId}/roles (List_2), GET /roles/{id} (Get) and GET /realms/{realmId}/roles/{id} (Get_2). id comes from @Params('id'); realmId is not a decorated argument and is synthesized as a required string path parameter on the two realm operations."></p>

- The array form is read by this preset; whether your runtime `@Controller` accepts an array is up to the decorator you use (a thin wrapper that registers each path works).
- A method path is a single string. Only the controller multiplies.
- A path variable that no parameter declares, such as `realmId` above, is still emitted as a required string path parameter, because OpenAPI requires every template variable to be declared.
- A second mount gets an `operationId` suffix (`List`, `List_2`). See [Multi-mount controllers](https://trapi.tada5hi.net/guide/metadata-decorators#multi-mount-controllers) for the path-based `operationIdStrategy`.

## Markers and JSDoc tags

<p align="center"><img src="./assets/pde-markers-jsdoc.svg" width="960" alt="On the same node, decorator handlers run first and JSDoc handlers second. @Hidden() and /** @hidden */ on a class or method set hidden to true, which leaves it out of the document. @Deprecated() on a class, method or model class and /** @deprecated */ on a method, parameter or property set deprecated to true. @IsInt(), @IsLong(), @IsFloat() and @IsDouble() on a parameter or class property, and the matching JSDoc tags on a property or as a method tag naming a parameter, narrow number to integer, long, float or double. /** @summary */ on a method sets the summary and has no decorator form. Both forms only set values, so neither undoes the other."></p>

Some facts can be written either as a decorator or as a JSDoc tag:

```typescript
@Controller('/users')
export class UserController {
    /**
     * @summary Count users
     * @deprecated
     */
    @Get('/count')
    count(): number { /* … */ }

    /**
     * @isInt id
     */
    @Get('/:id')
    @Hidden()
    get(@Params('id') id: number): User { /* … */ }
}
```

- On one class, method or parameter, decorator handlers run first and JSDoc handlers second. Every handler here only sets a value (`hidden: true`, `deprecated: true`, a summary), so either form alone is enough and neither can clear the other.
- The `hidden`, `deprecated` and numeric handlers carry a resolver **marker**. The type resolver looks decorators up by marker, not by name, so `@IsInt()` on a class property and `/** @isInt */` on an interface property narrow `number` to `integer` inside your models as well, and `@Deprecated()` on a model class marks its schema deprecated.
- On a parameter, `@IsInt()` / `@IsLong()` / `@IsFloat()` / `@IsDouble()` also record a validator with the OpenAPI format `int32` / `int64` / `float` / `double`.
- A hidden method is left out of the metadata. A hidden controller stays in the metadata with `hidden: true` and is skipped by the OpenAPI emitter.

## Responses, security and examples

<p align="center"><img src="./assets/pde-argument-shapes.svg" width="960" alt="@Security(['user:read'], 'oauth2') writes the requirement oauth2 with scope user:read. @Security(['admin']) without a scheme name uses the name default. @Security with an object writes one requirement naming bearer and apiKey. @Description of User with status 201 and Created adds a 201 response with a User schema, and the return type is still documented under 200 Ok. @Example with a payload and the label sample adds an example to the default 200 response. @Description with a status the compiler cannot resolve throws CORE_DECORATOR_ARGUMENT_INVALID."></p>

**`@Security(scopes?, name?)`** on a class or method appends one security requirement.

- `@Security(['user:read'], 'oauth2')` writes `{ oauth2: ['user:read'] }`. A single string scope works too: `@Security('user:read', 'oauth2')`.
- Without a name the scheme is called `default`: `@Security(['admin'])` writes `{ default: ['admin'] }`, and `@Security()` writes `{ default: [] }`.
- An object names several schemes in one requirement (they must all be satisfied): `@Security({ bearer: [], apiKey: ['a'] })`. Entries whose value is not a string array are dropped; if none is left, nothing is written.
- An array scope list with a non-string entry keeps the requirement but drops all its scopes, so the endpoint never looks unsecured.
- Several `@Security` decorators are alternatives (OR), as in OpenAPI.

**`@Description<T>(status?, description?, example?)`** on a class or method appends a response.

- `status` may be a number or string literal, or a constant the compiler can resolve (a `const`, an imported constant, an enum member such as `HttpStatus.NotFound`, an `as const` member). Without it the response is `200`. A status that is present but cannot be resolved, such as `computeStatus()`, throws a `CoreError` with code `CORE_DECORATOR_ARGUMENT_INVALID` that names the decorator, the method and the source location.
- `description` defaults to `'Response'`. The optional third argument becomes the response example. The type argument `T` becomes the response schema; without it the response has no schema.
- `@Description` does not change the success status. With `@Description<User>(201, 'Created')` the method's return type is still documented under `200` as well. Set the success status in a preset hook if you need it moved, see [Extending the preset](#extending-the-preset).

**`@Example(payload, label?)`** on a method adds an example to the default (success) response: `@Example({ name: 'a' }, 'sample')` writes `{ value: { name: 'a' }, label: 'sample' }`.

## Decorator reference

Every decorator and JSDoc tag the preset handles, taken from its handlers. "Class" is a controller class, "method" a controller method, "parameter" a method parameter. A decorator on a target not listed for it is not matched.

### Controller decorators

| Decorator | Writes |
| --- | --- |
| `@Controller(path \| paths[])` | `paths`. Missing or unreadable argument: `['']` |
| `@Mount(path \| paths[])` | `paths`, same shapes as `@Controller` (left unchanged if unreadable) |
| `@Tags(...tags)` | Appends to `tags`; array arguments are flattened |
| `@Produces(...types)` | Appends to `produces` |
| `@Consumes(...types)`, `@Accept(...types)` | Append to `consumes` |
| `@Security(scopes?, name?)` | Appends a requirement to `security` (see [above](#responses-security-and-examples)) |
| `@Description<T>(status?, description?, example?)` | Appends a response, inherited by every method |
| `@Extension(key, value)` | Appends an `x-` extension; ignored without a string key and a readable value |
| `@Hidden()` | `hidden: true` (marker `hidden`) |
| `@Deprecated()` | `deprecated: true` (marker `deprecated`) |

### Method decorators

| Decorator | Writes |
| --- | --- |
| `@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`, `@Options`, `@Head` `(path?)` | The verb, and `path` if the argument is a readable string |
| `@All(path?)` | Verb `get` (OpenAPI has no "any verb"), and `path` |
| `@Mount(path)` | `path` only; a method without a verb decorator is not emitted |
| `@Tags`, `@Produces`, `@Consumes`, `@Accept`, `@Security`, `@Description`, `@Extension`, `@Hidden`, `@Deprecated` | As on a controller |
| `@Example(payload, label?)` | Adds an example to the default response |

### Parameter decorators

| Decorator | With a name argument | Without |
| --- | --- | --- |
| `@Body(name?)` | `bodyProp` named `name` | `body` |
| `@Query(name?)` | `queryProp` named `name` | `query`, split into one `queryProp` per property |
| `@Params(name?)` | `path` | `context` |
| `@Headers(name?)` | `header` | `context` |
| `@Cookies(name?)` | `cookie` | `context` |
| `@Request()`, `@Response()`, `@Next()` | `context` | `context` |
| `@BodyProp(name)`, `@QueryProp(name)` | `bodyProp`, `queryProp` | same kind, named after the parameter |
| `@Path(name)`, `@PathParam(name)`, `@Param(name)` | `path` | `path`, named after the parameter |
| `@Header(name)`, `@Cookie(name)` | `header`, `cookie` | same kind, named after the parameter |
| `@Form`, `@FormProp`, `@File`, `@Files` `(name?)` | `formData` | `formData`, named after the parameter |
| `@Extension(key, value)` | Appends an `x-` extension to the parameter | |
| `@IsInt()`, `@IsLong()`, `@IsFloat()`, `@IsDouble()` | Narrows `number` to `integer`, `long`, `float`, `double`; adds a validator with format `int32`, `int64`, `float`, `double` (marker `numeric`) | |

The type resolver also finds `@IsInt` and friends and `@Extension` by marker on model properties, and `@Deprecated` on a model class (see [Markers and JSDoc tags](#markers-and-jsdoc-tags)).

### JSDoc tags

| Tag | On | Writes |
| --- | --- | --- |
| `@hidden` | class, method | `hidden: true` |
| `@deprecated` | method, parameter | `deprecated: true` |
| `@summary <text>` | method | `summary` |
| `@isInt`, `@isLong`, `@isFloat`, `@isDouble` | property, or a method tag naming a parameter (`@isInt id`) | Narrows `number` like the decorator |

Property-level `/** @deprecated */` is read by the type resolver directly.

## Extending the preset

Build your own preset on top of this one when you rename a decorator or add one. Handlers from a parent and a child are additive; `replaces: true` on a child handler removes every parent handler of the same kind and name, and `replaces: '@trapi/preset-decorators-express'` removes only this preset's.

```typescript
import type { Preset } from '@trapi/core';
import { MarkerName, method, readStringOrStringArray } from '@trapi/core';

const preset: Preset = {
    name: 'my-app/preset',
    extends: ['@trapi/preset-decorators-express'],
    methods: [
        // A new decorator: @Internal() hides a method, like @Hidden().
        method({
            match: { name: 'Internal', on: 'method' },
            marker: MarkerName.Hidden,
            apply: (_ctx, draft) => {
                draft.hidden = true;
            },
        }),
        // Replace the method-level @Security: the scheme is always "bearer".
        method({
            match: { name: 'Security', on: 'method' },
            replaces: true,
            apply: (ctx, draft) => {
                draft.security ??= [];
                draft.security.push({ bearer: readStringOrStringArray(ctx.argument(0)) ?? [] });
            },
        }),
    ],
};

export default preset;
```

<p align="center"><img src="./assets/pde-extend-preset.svg" width="960" alt="my-app/preset extends @trapi/preset-decorators-express. It adds an Internal method handler with marker hidden, and a Security method handler with replaces: true that shadows the parent's Security handler. On a controller, @Security(['admin']) then writes security bearer admin instead of the parent's default admin, and a method decorated with @Internal() is hidden and left out of the metadata."></p>

- Replacement is per kind: the example replaces the method `@Security` handler, while `@Security` on a class still uses this preset's handler.
- Pass the preset object, a relative path or a package name as `preset`. Its `extends` entries are resolved by name.
- A preset can also reconcile a method after all handlers ran through `finalizeMethod`, for example to set `successStatus` or success media types. See [Extending an existing preset](https://trapi.tada5hi.net/guide/framework-integration#extending-an-existing-preset) and [Custom Presets](https://trapi.tada5hi.net/guide/advanced-custom-presets).

## Notes

- **The preset maps names; it does not run anything.** It never imports `@decorators/express` and does not register routes, validate requests or patch decorators. Install and run `@decorators/express` in your app as usual.
- **Matching is by name and target only.** Any decorator called `Get` on a method is treated as a GET route, wherever it is imported from. Decorators the preset does not know (`@UseGuards`, middleware decorators, …) are ignored silently; set `strict: true` to get a warning listing them, or `strict: 'throw'` to fail.
- **`@All` is documented as `get`.** OpenAPI has no operation that matches every verb.
- **`@Request('user')` is still context.** The preset ignores the property argument of `@Request`, `@Response` and `@Next`.
- **Leading slashes are dropped in metadata.** `@Controller('/users')` stores `users` and `@Get('/')` stores `''`; the emitter joins them back into `/users`.
- **`@Description` adds a response, it does not move the success status.** See [Responses, security and examples](#responses-security-and-examples).
- **`@Hidden` is not a property decorator here.** It hides controllers and methods. To keep a property out of a schema, leave it off the type.

## Documentation

The guides at [trapi.tada5hi.net](https://trapi.tada5hi.net) cover the rest of the pipeline:

- [Framework Integration](https://trapi.tada5hi.net/guide/framework-integration): using this preset, the `@Description` status rules, extending a preset.
- [Decorators & Presets](https://trapi.tada5hi.net/guide/metadata-decorators): handlers, markers, multi-mount controllers.
- [Custom Presets](https://trapi.tada5hi.net/guide/advanced-custom-presets): `extends`, `replaces` and preset validation.

## License

Made with 💚

Published under [MIT License](./LICENSE).
