<p align="center"><img src="./assets/logo.svg" width="120" height="120" alt="TRAPI logo: the letter T inside a pair of generic type brackets"></p>
<h1 align="center">@trapi/preset-typescript-rest</h1>
<p align="center"><strong>A TRAPI preset that reads typescript-rest services into API metadata and OpenAPI documents.</strong></p>
<p align="center">Keep writing <code>@Path</code>, <code>@GET</code> and <code>@PathParam</code> in your typescript-rest services. This preset tells TRAPI what each of them means, so you write no handler code and no second route description.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/preset-typescript-rest"><img src="https://img.shields.io/npm/v/%40trapi%2Fpreset-typescript-rest" alt="npm version"></a>
  <a href="https://github.com/tada5hi/trapi/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-this-preset">Why</a> · <a href="#installation">Installation</a> · <a href="#usage">Usage</a> · <a href="#parameters">Parameters</a> · <a href="#decorator-reference">Reference</a> · <a href="#extending-the-preset">Extending</a> · <a href="#notes">Notes</a></p>

---

## Why this preset?

[typescript-rest](https://www.npmjs.com/package/typescript-rest) already describes your routes: `@Path` mounts a service, `@GET` picks the verb, `@PathParam('id')` binds an argument. TRAPI reads those decorators from the TypeScript source at build time, but it has to be told what each name means. This package is that mapping, written once for typescript-rest's vocabulary.

| Concern | Without this preset | With `@trapi/preset-typescript-rest` |
| --- | --- | --- |
| Routes | Write a [custom preset](https://trapi.tada5hi.net/guide/advanced-custom-presets) with a handler for `@Path` on classes, `@Path` on methods and each verb | `preset: '@trapi/preset-typescript-rest'` |
| Parameter locations | Map `@PathParam`, `@QueryParam`, `@HeaderParam`, `@CookieParam`, `@FileParam`, … to `path`, `query`, `header`, … yourself | Mapped; an undecorated argument is the body |
| Framework objects | `@ContextRequest req` ends up as a body parameter, and resolving its type pulls the framework's request type into your schemas | The five `Context*` decorators produce no parameter and their types are never resolved |
| Responses and security | Parse `@Description<T>(status, text, example)` and `@Security(scopes, name)` argument by argument | Read into responses, examples and security requirements |
| Documentation markers | Pick names for "hidden", "deprecated", integer formats and vendor extensions, and teach the type resolver about them | `@Hidden`, `@Deprecated`, `@Tags`, `@Extension`, `@IsInt` … and their JSDoc tags are handled |

The preset is a plain `Preset` object (the package's default export). It peer-depends on `@trapi/core` only, extends no other preset and adds nothing to your application at runtime.

<p align="center"><img src="./assets/service-metadata.svg" width="960" alt="The class UserService is decorated with @Path('/users'). Its method get carries @GET and @Path(':id') and takes @PathParam('id') @IsInt id: number and @ContextRequest req. The preset turns @Path on the class into Controller.paths ['users'], @GET plus @Path on the method into method 'get' with path ':id' and a default 200 response with the User return type, and @PathParam with @IsInt into a path parameter id of type integer. The @ContextRequest parameter produces no parameter and its type is never resolved."></p>

The same decorator name serves two targets: `@Path` on a class writes the controller's mount paths, `@Path` on a method writes the method path. The metadata above is what `generateMetadata` returns for that service with this preset.

**Table of Contents**
- [Installation](#installation)
- [Usage](#usage)
  - [Generate an OpenAPI document](#generate-an-openapi-document)
  - [From the CLI](#from-the-cli)
  - [Pass the preset object](#pass-the-preset-object)
- [Routing](#routing)
- [Parameters](#parameters)
- [Responses](#responses)
- [Security](#security)
- [Markers and JSDoc tags](#markers-and-jsdoc-tags)
- [Decorator reference](#decorator-reference)
- [Extending the preset](#extending-the-preset)
- [Notes](#notes)
- [Documentation](#documentation)
- [License](#license)

## Installation

```bash
npm install --save-dev @trapi/metadata @trapi/preset-typescript-rest
```

Add `@trapi/swagger` to emit OpenAPI documents, or `@trapi/cli` for the `trapi` command. The preset is ESM-only and has one peer dependency, `@trapi/core`, at the exact version listed in its `peerDependencies` (npm 7+ installs it for you). Install `@trapi/core` explicitly when you [extend the preset](#extending-the-preset), because your own code then imports from it.

`typescript-rest` itself stays a dependency of your application: TRAPI only reads its decorator names from the source.

## Usage

### Generate an OpenAPI document

Reference the preset by package name when you generate metadata, then hand the metadata to `@trapi/swagger`:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: ['src/services/**/*.ts'],
    preset: '@trapi/preset-typescript-rest',
    tsconfig: 'tsconfig.json',
});

const spec = await generateSwagger({
    version: 'v3.1',
    metadata,
    data: { name: 'Users API', version: '1.0.0' },
});

await saveSwagger(spec, { cwd: 'docs', name: 'openapi', format: 'json' });
```

The preset name is resolved with Node's module resolution from your project and validated before any handler runs.

### From the CLI

```bash
npm install --save-dev @trapi/cli @trapi/preset-typescript-rest
npx trapi generate \
  --preset @trapi/preset-typescript-rest \
  --entry-point 'src/services/**/*.ts' \
  --output docs/openapi.json \
  --version 3.1
```

### Pass the preset object

The default export is the `Preset` itself, so you can import it and pass the object instead of a name:

```typescript
import { generateMetadata } from '@trapi/metadata';
import preset from '@trapi/preset-typescript-rest';

const metadata = await generateMetadata({
    entryPoint: ['src/services/**/*.ts'],
    preset,
    strict: true,
});
```

`strict: true` warns about every decorator no handler matched (`strict: 'throw'` fails instead). Turn it on once: it lists the typescript-rest decorators this preset does not map, such as `@FormParam` (see [Notes](#notes)).

## Routing

```typescript
import { GET, POST, Path, PathParam } from 'typescript-rest';

type User = { id: number, name: string };

@Path('/users')
export class UserService {
    @GET
    list(): User[] {
        return [];
    }

    @GET
    @Path(':id')
    get(@PathParam('id') id: number): User {
        return { id, name: '' };
    }

    @POST
    create(user: User): User {
        return user;
    }
}
```

- **`@Path(path)` on a class** sets `Controller.paths`. A string array is accepted too (one mount per entry); without an argument the controller is mounted at `''`. A leading slash is normalised away: `'/users'` is stored as `'users'`.
- **`@Path(path)` on a method** sets `Method.path`. `@Mount(path)` on a method does the same. A non-string argument leaves the path empty.
- **Verbs:** `@GET`, `@POST`, `@PUT`, `@DELETE`, `@PATCH`, `@OPTIONS` and `@HEAD` set the HTTP method. `@ALL` is documented as `get`, since OpenAPI has no "any verb" operation.
- A method without a verb decorator is not part of the metadata.

## Parameters

<p align="center"><img src="./assets/parameter-kinds.svg" width="960" alt="Each typescript-rest parameter decorator sets the parameter's in kind: @PathParam gives path, @QueryParam and @Param give queryProp (emitted as an OpenAPI query parameter), @HeaderParam gives header, @CookieParam gives cookie, and @FileParam and @FilesParam give formData. A parameter without a decorator becomes the body. The five Context decorators (@ContextRequest, @ContextResponse, @ContextNext, @ContextLanguage, @ContextAccept) mark a context parameter, which produces no parameter and whose type is never resolved. @FormParam has no handler in this preset, so the parameter falls back to body."></p>

| Decorator | Parameter `in` | OpenAPI location |
| --- | --- | --- |
| `@PathParam(name)` | `path` | path |
| `@QueryParam(name)` | `queryProp` | query |
| `@Param(name)` | `queryProp` | query |
| `@HeaderParam(name)` | `header` | header |
| `@CookieParam(name)` | `cookie` | cookie (V3 only) |
| `@FileParam(name)`, `@FilesParam(name)` | `formData` | `multipart/form-data` field |
| `@ContextRequest`, `@ContextResponse`, `@ContextNext`, `@ContextLanguage`, `@ContextAccept` | `context` | none |
| _no decorator_ | `body` | request body |

- **The name** comes from the first argument when it is a string literal or a constant that resolves to one; otherwise the TypeScript argument name is used.
- **`@Param`** binds the query string or a form field in typescript-rest. An OpenAPI parameter has one location, so it is documented as a query parameter. [Map it yourself](#extending-the-preset) if your service uses it for forms.
- **Context parameters** are skipped before their type is resolved, so `express.Request` and friends never reach your schemas.
- **The body** is the one undecorated argument. A second undecorated argument fails with `GENERATOR_BODY_PARAMETER_DUPLICATE`; a body next to a `@FileParam` fails with `GENERATOR_BODY_FORM_CONFLICT`; an undecorated argument on an `@OPTIONS` or `@HEAD` method is rejected with `GENERATOR_PARAMETER_GENERATION_FAILED` (cause: `PARAMETER_METHOD_UNSUPPORTED`).
- Optionality, defaults and the JSDoc description come from the TypeScript declaration, not from the preset.

## Responses

<p align="center"><img src="./assets/description-responses.svg" width="960" alt="On the method get, @Description&lt;ApiError&gt;(404, 'User not found', { message: 'not found' }) adds a handler response with status 404, that description, the payload as its example and the ApiError type argument as its schema. @Example&lt;User&gt;({ id: 1, name: 'Ada' }) adds an example to the default response, which is status 200, description Ok, with the User return type as schema. @Description() with no status documents status 200 with description Response. @Description(200, 'OK') without a type argument takes the place of the default 200 response and carries no schema. A status that cannot be resolved, such as @Description(computeStatus()), throws CORE_DECORATOR_ARGUMENT_INVALID."></p>

`@Description<T>(status?, description?, example?)` on a method adds one response:

- **`status`** is a literal (`404`, `'404'`) or a constant the compiler can resolve: a `const`, an imported constant, a numeric enum member or an `as const` member. Without it the response is documented under `200`. A status that is present but cannot be resolved, such as `@Description(computeStatus())`, fails generation with `CoreErrorCode.DECORATOR_ARGUMENT_INVALID` (`'CORE_DECORATOR_ARGUMENT_INVALID'`), naming the decorator, the method and the source location.
- **`description`** must be a string literal. Anything else, including a constant, falls back to `'Response'`.
- **`example`** becomes the response's example when its value can be read statically.
- **`T`** becomes the response schema. Without a type argument the response has no schema.

`@Example<T>(value)` adds an example to the default response, the one documented for the return type (`200 Ok`, or `204 No content` for `void`). It takes a single argument; there is no label.

The default response is appended unless a `@Description` already uses its status. So `@Description(200, 'OK')` without a type argument replaces the return type's `200` response with one that has no schema; write `@Description<User>(200, 'OK')` to keep it.

## Security

<p align="center"><img src="./assets/security-shapes.svg" width="960" alt="Security entries produced by this preset's @Security(scopes, name). @Security(['users:read'], 'oauth2') and @Security('users:read', 'oauth2') give { oauth2: ['users:read'] }. Without a name the scheme is called default: @Security('users:read') gives { default: ['users:read'] } and @Security() gives { default: [] }. Two decorators add two alternatives. A scopes array with a non-string entry keeps the entry but drops every scope. A name that is a constant instead of a string literal falls back to default, and the object form @Security({ oauth2: [...] }) is not read and gives { default: [] }."></p>

`@Security(scopes?, name?)` follows typescript-rest's argument order: scopes (a string or an array of strings) first, the scheme name second.

- Each `@Security` adds one entry to `Method.security`; several entries are alternatives.
- Without a name the entry is keyed `default`. The name must be a string literal; a constant falls back to `default`.
- A scopes array with a non-string entry keeps the requirement but drops all scopes, so the endpoint never appears unsecured because of a typo.
- Only methods are matched. A class-level `@Security` and the object form `@Security({ oauth2: [...] })` are not read by this preset.
- The scheme name has to match a security scheme you pass to `@trapi/swagger`.

## Markers and JSDoc tags

typescript-rest has no decorators for documentation-only concerns. The preset matches the TRAPI marker names on top of typescript-rest's own, so declare them as no-op decorators in your application (or copy them from [`examples/decorators`](https://github.com/tada5hi/trapi/tree/master/examples/decorators)):

```typescript
type AnyDecorator = (...args: any[]) => void;

const noop: AnyDecorator = () => undefined;

export function Description<T = unknown>(status?: number | string, description?: string, example?: T): AnyDecorator {
    return noop;
}
export function Example<T>(value: T): AnyDecorator {
    return noop;
}
export function Tags(...names: string[]): AnyDecorator {
    return noop;
}
export function Extension(key: string, value: unknown): AnyDecorator {
    return noop;
}
export const Hidden: AnyDecorator = noop;
export const Deprecated: AnyDecorator = noop;
export const IsInt: AnyDecorator = noop;
```

<p align="center"><img src="./assets/markers-jsdoc.svg" width="960" alt="Which markers this preset handles on each target. Hidden: @Hidden and the JSDoc tag @hidden on a class and on a method. Deprecated: @Deprecated on a class, @Deprecated and @deprecated on a method, the JSDoc tag @deprecated on a parameter and on a model property. @Tags, @Produces, and @Consumes or @Accept on a class and a method. @Extension on a class, method, parameter and model property. The JSDoc tag @summary on a method. Numeric markers: @IsInt, @IsLong, @IsFloat and @IsDouble on a parameter and a model property, plus the JSDoc tags @isInt to @isDouble on a model property. Decorator handlers run first on each node, then JSDoc handlers."></p>

- **Order:** on every class, method and parameter, the decorator handlers run first and the JSDoc handlers after them.
- **Hidden:** a hidden method is left out of the metadata. A hidden class stays in it with `hidden: true`, and `@trapi/swagger` leaves it out of the document.
- **Deprecated** on a class marks every operation of that class deprecated in the emitted document. `@Deprecated` on a model class marks its schema deprecated.
- **Tags, media types:** class-level `@Tags`, `@Produces` and `@Consumes`/`@Accept` apply to every method of the class; method-level values are added to them.
- **Numeric markers** turn a `number` into `integer`, `long`, `float` or `double`. On a parameter, `@IsInt` also records an `isInt` validator with OpenAPI format `int32` (`int64`, `float`, `double` for the others). The JSDoc forms (`/** @isInt */`) work on model properties; on a method argument, use the decorator.
- **Summary:** `/** @summary Fetch one user */` on a method sets its summary. The leading JSDoc text becomes the description without any handler.

## Decorator reference

Every name this preset matches, by target. Anything else is ignored unless you enable `strict`.

**Class**

| Decorator / tag | Arguments | Contributes |
| --- | --- | --- |
| `@Path` | `path: string \| string[]` | `Controller.paths`; `['']` without an argument |
| `@Hidden` | none | `hidden: true` |
| `@Deprecated` | none | `deprecated: true`, cascaded to every operation |
| `@Tags` | `...names: string \| string[]` | appended to `tags` |
| `@Produces` | `...types: string \| string[]` | appended to `produces` |
| `@Consumes`, `@Accept` | `...types: string \| string[]` | appended to `consumes` |
| `@Extension` | `key: string, value` | `{ key, value }` appended to `extensions` |
| `/** @hidden */` | none | `hidden: true` |

**Method**

| Decorator / tag | Arguments | Contributes |
| --- | --- | --- |
| `@GET`, `@POST`, `@PUT`, `@DELETE`, `@PATCH`, `@OPTIONS`, `@HEAD` | none | `method` (`'get'`, `'post'`, …) |
| `@ALL` | none | `method: 'get'` |
| `@Path`, `@Mount` | `path: string` | `path` |
| `@Description<T>` | `status?, description?, example?` | one entry in `responses` (see [Responses](#responses)) |
| `@Example<T>` | `value` | an example on the default response |
| `@Security` | `scopes?: string \| string[], name?: string` | one entry in `security` (see [Security](#security)) |
| `@Hidden` | none | method is left out of the metadata |
| `@Deprecated` | none | `deprecated: true` |
| `@Tags` | `...names: string \| string[]` | appended to `tags` |
| `@Produces` | `...types: string \| string[]` | appended to `produces` |
| `@Consumes`, `@Accept` | `...types: string \| string[]` | appended to `consumes` |
| `@Extension` | `key: string, value` | `{ key, value }` appended to `extensions` |
| `/** @hidden */` | none | method is left out of the metadata |
| `/** @deprecated */` | none | `deprecated: true` |
| `/** @summary text */` | text | `summary` |

**Parameter**

| Decorator / tag | Arguments | Contributes |
| --- | --- | --- |
| `@PathParam` | `name?` | `in: 'path'` |
| `@QueryParam`, `@Param` | `name?` | `in: 'queryProp'` |
| `@HeaderParam` | `name?` | `in: 'header'` |
| `@CookieParam` | `name?` | `in: 'cookie'` |
| `@FileParam`, `@FilesParam` | `name?` | `in: 'formData'` |
| `@ContextRequest`, `@ContextResponse`, `@ContextNext`, `@ContextLanguage`, `@ContextAccept` | none | `in: 'context'`: no parameter is emitted |
| `@Extension` | `key: string, value` | `{ key, value }` appended to `extensions` |
| `@IsInt`, `@IsLong`, `@IsFloat`, `@IsDouble` | none | type `integer` / `long` / `float` / `double` plus an `isInt` … `isDouble` validator (format `int32` / `int64` / `float` / `double`) |
| `/** @deprecated */` | none | `deprecated: true` |
| `/** @isInt */`, `/** @isLong */`, `/** @isFloat */`, `/** @isDouble */` | none | resolver marker: narrows `number` model properties |

The type resolver finds these handlers by their marker, not by name: `@Extension` and the numeric markers (decorator or JSDoc tag) also apply to model properties, and `@Deprecated` on a model class marks its schema deprecated.

## Extending the preset

<p align="center"><img src="./assets/extend-replaces.svg" width="960" alt="A user preset named my-app/preset extends @trapi/preset-typescript-rest and adds two parameter handlers built by a formParam helper that writes in: formData. formParam('FormParam') matches a name the parent does not handle, so it is simply added. formParam('Param', '@trapi/preset-typescript-rest') sets replaces to the parent's name, which removes the parent's Param handler that wrote queryProp. In the merged registry the parent's remaining handlers come first (the five Context names, QueryParam, HeaderParam, CookieParam, PathParam, FileParam, FilesParam, Extension and the numeric markers), followed by the two my-app handlers."></p>

Write your own preset with `extends: ['@trapi/preset-typescript-rest']` to add or change a mapping. This one documents `@FormParam` and form-bound `@Param` as form fields:

```typescript
import {
    ParamKind,
    type Preset,
    parameter,
    readString,
} from '@trapi/core';

function formParam(name: string, replaces?: string) {
    return parameter({
        match: { name, on: 'parameter' },
        replaces,
        apply: (ctx, draft) => {
            draft.in = ParamKind.FormData;

            const argName = readString(ctx.argument(0));
            if (argName) {
                draft.name = argName;
            }
        },
    });
}

const preset: Preset = {
    name: 'my-app/preset',
    extends: ['@trapi/preset-typescript-rest'],
    parameters: [
        formParam('FormParam'),
        formParam('Param', '@trapi/preset-typescript-rest'),
    ],
};

export default preset;
```

- **Handlers are additive.** Parent handlers run first, yours after, so on a scalar field such as `in` your handler wins even without `replaces`.
- **`replaces: '<preset name>'`** removes that preset's handlers for the same decorator name and target; `replaces: true` removes every parent's. Same-preset handlers are never removed.
- Pass the preset object or a path to its module as `preset`. The generator resolves `extends` by name, so `@trapi/preset-typescript-rest` must be installed.

See [Custom presets](https://trapi.tada5hi.net/guide/advanced-custom-presets) for markers, JSDoc handlers, finalizers and testing a preset.

## Notes

- **It maps names only.** The preset matches decorators by name in the TypeScript AST. It does not import typescript-rest, run your services or check that a decorator came from typescript-rest; any `@Path` is treated as a route. Your application still installs and runs `typescript-rest`.
- **`@FormParam` is not mapped.** A `@FormParam` argument falls back to the body, and next to a `@FileParam` the method fails with `GENERATOR_BODY_FORM_CONFLICT`. Map it in your own preset as shown in [Extending the preset](#extending-the-preset).
- **`@Param` is documented as query.** typescript-rest also binds it from form fields; OpenAPI can hold only one location.
- **`@ALL` is documented as `get`.** The operation does not list the other verbs.
- **Method-only shapes.** `@Description`, `@Example` and `@Security` are read on methods only. `@Example` has no label argument, the `@Description` text and the `@Security` name must be string literals, and the object form of `@Security` is not read.
- **No schema without a type argument.** `@Description(200, 'OK')` replaces the default `200` response and has no schema; add the type argument.
- **Hidden parameters and properties** are not handled: `@Hidden` applies to classes and methods only.
- **Unmatched decorators are silent by default.** Use `strict: true` (warn) or `strict: 'throw'` to list them; JSDoc tags are not part of that report.

## Documentation

The guide covers presets, custom handlers and every emitter option: [trapi.tada5hi.net](https://trapi.tada5hi.net). Start with [Framework integration](https://trapi.tada5hi.net/guide/framework-integration) and [Decorators and presets](https://trapi.tada5hi.net/guide/metadata-decorators). Inspect the [`CHANGELOG.md`](https://github.com/tada5hi/trapi/blob/master/packages/preset-typescript-rest/CHANGELOG.md) for breaking changes.

## License

Made with 💚

Published under [MIT License](https://github.com/tada5hi/trapi/blob/master/LICENSE).
