<p align="center"><img src="./assets/logo.svg" width="120" height="120" alt="TRAPI logo: the letter T inside a pair of generic type brackets"></p>
<h1 align="center">@trapi/swagger</h1>
<p align="center"><strong>Turn TRAPI metadata into OpenAPI 2.0, 3.0, 3.1 or 3.2 documents, saved as JSON or YAML.</strong></p>
<p align="center">Pass a <code>Metadata</code> object and a version. The emitter handles the encodings that differ between versions, and it needs no TypeScript compiler.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/swagger"><img src="https://img.shields.io/npm/v/%40trapi%2Fswagger" alt="Swagger package version"></a>
  <a href="https://github.com/tada5hi/trapi/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-trapiswagger">Why</a> · <a href="#installation">Installation</a> · <a href="#usage">Usage</a> · <a href="#version-differences">Versions</a> · <a href="#configuration">Configuration</a> · <a href="#saving-to-disk">Saving</a> · <a href="#api">API</a> · <a href="#notes">Notes</a></p>

---

## Why @trapi/swagger?

OpenAPI 2.0, 3.0 and 3.1 disagree on how to write the same thing down: where a reference points, how a nullable value is marked, where a request body lives, which keys may sit next to a `$ref`. Supporting more than one version by hand means a second serializer per version, kept in step with every change to your types.

`@trapi/swagger` reads one framework-neutral `Metadata` object (the contract from [`@trapi/core`](https://www.npmjs.com/package/@trapi/core)) and writes each version's encoding from it.

| Concern | Writing the document yourself | With `@trapi/swagger` |
| --- | --- | --- |
| Several OpenAPI versions | One serializer per version, or post-processing that rewrites `$ref` prefixes and `nullable` | `version: 'v2' \| 'v3' \| 'v3.1' \| 'v3.2'` on the same `Metadata` |
| Shapes a version cannot express | Silent invalid output (a `$ref` on a 2.0 query parameter, `allowEmptyValue` on a header) | Dereferenced or floored to a valid inline type; impossible combinations throw a `SwaggerError` with a code |
| Controllers mounted at several paths | Copy operations, invent unique `operationId`s, declare every path variable | `controller.paths × method.path`, `_2` suffixes or `operationIdStrategy: 'path'`, missing path variables declared |
| Where the metadata comes from | Tied to one extractor | Any producer: `generateMetadata` from `@trapi/metadata`, a cached JSON file, a hand-built fixture |
| Writing files | Your own JSON/YAML serialization and naming | `saveSwagger(spec, { format: 'yaml' })`, one file per call |

```typescript
import { generateSwagger } from '@trapi/swagger';

const v2 = await generateSwagger({ version: 'v2', metadata });   // SpecV2: swagger: '2.0'
const v31 = await generateSwagger({ version: 'v3.1', metadata }); // SpecV3: openapi: '3.1.0'
```

<p align="center"><img src="./assets/generate-dispatch.svg" width="960" alt="generateSwagger receives a version, a Metadata object and optional data. isMetadata checks that metadata has a controllers array and a referenceTypes object; anything else throws SwaggerError SWAGGER_METADATA_INVALID. Version v2 goes to V2Generator, which emits swagger 2.0 with references under #/definitions/. Versions v3, v3.1 and v3.2 go to V3Generator, which emits openapi 3.0.0, 3.1.0 or 3.2.0 with references under #/components/schemas/."></p>

`generateSwagger` checks the shape of `metadata` first (`controllers` must be an array, `referenceTypes` an object) and throws `SwaggerError` with code `SWAGGER_METADATA_INVALID` otherwise. `'v2'` is emitted by `V2Generator`; `'v3'`, `'v3.1'` and `'v3.2'` share `V3Generator`, which writes `openapi: '3.0.0'`, `'3.1.0'` or `'3.2.0'`.

The stable public surface is documented in the [API Reference](https://trapi.tada5hi.net/guide/swagger-api-reference). Anything not listed there should be treated as internal even if it is re-exported, and may change without a major version bump. Inspect the `CHANGELOG.md` in the repository for breaking changes.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [From decorated TypeScript](#from-decorated-typescript)
  - [Bring your own metadata](#bring-your-own-metadata)
- [Version differences](#version-differences)
  - [Nullable types](#nullable-types)
  - [References and their siblings](#references-and-their-siblings)
  - [Intersections and tuples](#intersections-and-tuples)
  - [Request bodies and media types](#request-bodies-and-media-types)
  - [File uploads](#file-uploads)
  - [Swagger 2.0 non-body parameters](#swagger-20-non-body-parameters)
  - [Security definitions](#security-definitions)
- [Paths and operation ids](#paths-and-operation-ids)
- [Configuration](#configuration)
- [Saving to disk](#saving-to-disk)
- [API](#api)
- [Errors](#errors)
- [Notes](#notes)
- [Structure](#structure)
- [License](#license)

## Installation

```bash
npm install --save @trapi/swagger
```

- ESM only (`"type": "module"`); load it with `import` or a dynamic `import()` from CommonJS.
- The package manifest declares `engines.node >= 24`.
- Runtime dependencies are `@trapi/core`, `@ebec/core`, `smob` and `locter`. There is no dependency on `@trapi/metadata` or the TypeScript compiler.

To extract metadata from decorated TypeScript, install [`@trapi/metadata`](https://www.npmjs.com/package/@trapi/metadata) as well, plus a preset matching the decorator library of your controllers (or your own preset). The examples below use [@decorators/express](https://github.com/serhiisol/node-decorators) via [`@trapi/preset-decorators-express`](https://www.npmjs.com/package/@trapi/preset-decorators-express):

```bash
npm install --save @trapi/metadata @trapi/preset-decorators-express @decorators/express
```

## Usage

### From decorated TypeScript

`generateSwagger()` takes a pre-built `Metadata` value and returns the OpenAPI document as a plain object. Compose it with `generateMetadata` from `@trapi/metadata`:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
});

const spec = await generateSwagger({
    version: 'v3',
    metadata,
    data: {
        name: 'My API',
        version: '1.0.0',
        description: 'Example service',
        servers: 'https://api.example.com',
    },
});

await saveSwagger(spec, { cwd: './docs', format: 'yaml' });
```

Reuse the same `metadata` for several targets so the TypeScript walk runs once. Emitting a document leaves the metadata usable for the next one: emitting v2 and then v3 from one object gives the same v3 document as emitting v3 alone.

```typescript
const specV3 = await generateSwagger({ version: 'v3', metadata });
const specV2 = await generateSwagger({ version: 'v2', metadata });
```

The return type follows `version`: `SpecV2` for `'v2'`, `SpecV3` for any 3.x value. Use `OutputForVersion<V>` to type your own wrappers:

```typescript
import { generateSwagger } from '@trapi/swagger';
import type { OutputForVersion, Version } from '@trapi/swagger';

async function emit<V extends `${Version}`>(version: V): Promise<OutputForVersion<V>> {
    return generateSwagger({ version, metadata });
}
```

You do not have to write the result to disk. Serve it from a handler, hand it to Swagger UI or Redoc, or pass it to [`saveSwagger()`](#saving-to-disk).

### Bring your own metadata

Any value of the `Metadata` shape (`{ controllers, referenceTypes }`) works: a JSON cache file, a Babel-based extractor, or a hand-rolled fixture. `@trapi/metadata` does not need to be installed for this.

```typescript
import { promises as fs } from 'node:fs';
import type { Metadata } from '@trapi/core';
import { generateSwagger } from '@trapi/swagger';

const metadata: Metadata = JSON.parse(await fs.readFile('cache/metadata.json', 'utf8'));
const spec = await generateSwagger({ version: 'v3', metadata });
```

Only the shape is checked up front. A value that is not an object with a `controllers` array and a `referenceTypes` object throws `SwaggerError` with code `SWAGGER_METADATA_INVALID`; problems inside the controllers surface as the [error codes](#errors) below while emitting.

## Version differences

| `version` | Document header | References | Emitter |
| --- | --- | --- | --- |
| `'v2'` | `swagger: '2.0'` | `#/definitions/` | `V2Generator` |
| `'v3'` | `openapi: '3.0.0'` | `#/components/schemas/` | `V3Generator`, 3.0 mode |
| `'v3.1'` | `openapi: '3.1.0'` | `#/components/schemas/` | `V3Generator`, 3.1-or-later mode |
| `'v3.2'` | `openapi: '3.2.0'` | `#/components/schemas/` | `V3Generator`, 3.1-or-later mode |

The fragments in the diagrams below were captured from the built package, run against hand-built metadata.

### Nullable types

<p align="center"><img src="./assets/nullable-versions.svg" width="960" alt="The metadata property nickname has a union type of string and an enum whose only member is null. Swagger 2.0 emits type string with x-nullable true. OpenAPI 3.0 emits type string with nullable true. OpenAPI 3.1 and 3.2 emit anyOf with a string schema and a null schema."></p>

- **v2** writes the vendor extension `x-nullable: true`; Swagger 2.0 has no null type.
- **v3** (3.0) writes `nullable: true`. A nullable *reference* cannot carry it beside the `$ref`, so it is wrapped: `{ allOf: [{ $ref }], nullable: true }`.
- **v3.1 / v3.2** add a `{ type: 'null' }` member to `anyOf`. A nullable enum gets a type array instead: `type: ['string', 'null']`.

### References and their siblings

<p align="center"><img src="./assets/ref-siblings.svg" width="960" alt="The metadata property role has the description Access level and a refEnum type named Role. Swagger 2.0 emits only a $ref to #/definitions/Role and drops the description. OpenAPI 3.0 emits only a $ref to #/components/schemas/Role. OpenAPI 3.1 and 3.2 keep the description beside the $ref."></p>

Swagger 2.0 and OpenAPI 3.0 require `$ref` to be the only key of a schema, so a property whose type is a reference loses its description, example, format, default and validators in those versions. OpenAPI 3.1 relaxed the rule, and `'v3.1'` and `'v3.2'` keep them.

### Intersections and tuples

<p align="center"><img src="./assets/lossy-shapes.svg" width="960" alt="An intersection of the refObjects User and Timestamps is flattened by Swagger 2.0 into one object schema with all properties and the combined required list, and composed by OpenAPI 3.x as allOf of two $refs. A tuple with elements x of type double and label of type string becomes, in every version, an array whose items are anyOf number and string, losing element names and positions."></p>

The metadata keeps TypeScript's shapes intact; lossy conversions happen here, in the emitter.

- **Intersections**: v2 flattens the properties of every `refObject` member into one object and merges their `required` lists. Per-property descriptions are not copied, and a member that is not a `refObject` (an inline object literal) is dropped. v3 emits `allOf` with one schema per member.
- **Tuples**: every version emits `type: 'array'` with `items: { anyOf: [...] }` (a single-element tuple gets that element's schema as `items`, an empty one `items: {}`). Element names and positions are lost. v2 emits the `anyOf` as well, although Swagger 2.0 does not define it.
- **`void` and `never`** responses get no `schema` (v2) or `content` (v3).

### Request bodies and media types

<p align="center"><img src="./assets/request-body.svg" width="960" alt="A metadata parameter named body with in body and the refObject type User becomes, in Swagger 2.0, a parameter with in body and a schema $ref to #/definitions/User, and in OpenAPI 3.x a requestBody whose content is keyed by media type. The media type comes from the first rule that applies: the method's consumes merged with the controller's, multipart/form-data for a file or buffer form field, application/x-www-form-urlencoded for other form fields, then a version-specific fallback: application/json in v2 for a body or a post, put or patch; data.consumes, then application/json, in v3."></p>

- **v2** emits the body as an `in: 'body'` parameter and the media types as the operation's `consumes`.
- **v3** emits a `requestBody` and uses the media types as the keys of `requestBody.content`; form parameters become the properties of one object schema there.
- `@BodyProp` parameters are merged into the body: into a synthesized object when there is no `@Body`, into the declared object otherwise (v2 flattens it, v3 composes a named type with `allOf`). A body type with no object shape (a scalar, array, union or enum) next to body properties throws `SWAGGER_BODY_PROP_TYPE_CONFLICT`.
- Both emitters cascade the controller's `consumes`/`produces` onto each method (controller entries first, duplicates removed).

Responses resolve their media type in the opposite direction per version. v2 uses the method's `produces`, then the media types its responses declare (`application/octet-stream` for a binary response), then `application/json`. v3 uses a response's own `produces`, then the method's, then `data.produces`, then `application/json`.

### File uploads

<p align="center"><img src="./assets/file-upload.svg" width="960" alt="A formData parameter of type buffer, which is what @trapi/metadata emits for an upload, becomes in Swagger 2.0 a formData parameter with type string and format byte, and in OpenAPI 3.x a property with type string and format byte in a multipart/form-data object schema. A formData parameter of type file, which only hand-built metadata contains, becomes type file in Swagger 2.0 and type string with format binary in OpenAPI 3.x."></p>

`@trapi/metadata` resolves an upload argument to the type `buffer`; the type `file` only reaches the emitter through hand-built metadata. Both select `multipart/form-data`, but they differ in the parameter schema: only `file` becomes `type: 'file'` in v2 and `format: 'binary'` in v3, while `buffer` is emitted as `type: 'string', format: 'byte'` in both.

### Swagger 2.0 non-body parameters

<p align="center"><img src="./assets/v2-parameters.svg" width="960" alt="A query parameter role of the refEnum Role is dereferenced in Swagger 2.0 to type string with enum admin and user, while OpenAPI 3.x keeps a schema $ref to #/components/schemas/Role. A query parameter filter of a nested object literal type has no 2.0 representation and is floored to type string, while OpenAPI 3.x emits a schema of type object."></p>

In Swagger 2.0 only body parameters have a `schema`; query, path, header and formData parameters need an inline `type` from `string`, `number`, `integer`, `boolean`, `array` (and `file` for formData). v2 therefore:

- inlines a `refEnum` as `type` plus `enum`;
- follows a `refAlias` to its target and keeps the alias's `format`, `default`, `description` and validators;
- falls back to `type: 'string'` for anything else it cannot express: objects, unions, `any`, cyclic aliases. Emit v3 when the real shape of such a parameter matters.

Other per-version parameter rules: array query and formData parameters in v2 get a `collectionFormat` (the parameter's own, then `data.collectionFormat`, then `'multi'`). v3 writes `allowEmptyValue` on query parameters only, as OpenAPI 3.x allows it nowhere else; v2 never writes it. Cookie parameters exist only in v3; v2 leaves them out.

### Security definitions

<p align="center"><img src="./assets/security-definitions.svg" width="960" alt="An http bearer scheme with bearerFormat JWT and an oauth2 scheme with an authorizationCode flow become, in Swagger 2.0 securityDefinitions, an apiKey in the Authorization header and an oauth2 definition renamed oauth2AccessCode with flow accessCode. In OpenAPI 3.x components.securitySchemes both are emitted as given."></p>

`data.securityDefinitions` uses the OpenAPI 3 vocabulary (`apiKey`, `http` with any scheme, `oauth2` with `flows`). v3 writes it to `components.securitySchemes` as given (dropping `bearerFormat` from any scheme other than bearer). v2 writes `securityDefinitions` and translates:

| Input | v2 output |
| --- | --- |
| `{ type: 'http', scheme: 'basic' }` | `{ type: 'basic' }` |
| `{ type: 'http', scheme: 'bearer' \| other }` | `{ type: 'apiKey', in: 'header', name: 'Authorization' }` with your `description`, or a generated one such as `HTTP bearer authentication: send "Authorization: Bearer <JWT>".` |
| `{ type: 'apiKey', ... }` | unchanged |
| `{ type: 'oauth2', flows }` | one definition per flow: `<key>Implicit`, `<key>Password`, `<key>AccessCode` (from `authorizationCode`), `<key>Application` (from `clientCredentials`) |

Operation-level `security` comes from the metadata (the `@Security` decorator of your preset); this option only defines the schemes. Note that operations referencing an OAuth2 scheme by `<key>` do not match the renamed v2 definitions.

## Paths and operation ids

<p align="center"><img src="./assets/multi-mount.svg" width="960" alt="A controller mounted at /roles and /realms/:realmId/roles with the methods list and get emits four operations. With the default method strategy their operationIds are List, List_2, Get and Get_2; with operationIdStrategy path they are getRoles, getRealmsByRealmIdRoles, getRolesById and getRealmsByRealmIdRolesById. The declared path parameter id appears only where the URL contains {id}; realmId, which no argument declares, is synthesized as a required string path parameter."></p>

- **Paths**: every combination of `controller.paths` and `method.path` is emitted. `:id`, `<id>` and `<:id>` become `{id}`, and the root combinations always start with `/`.
- **Path parameters**: a declared path parameter appears only on operations whose URL contains `{name}`. A template variable that no argument declares is added as `{ in: 'path', required: true, type: 'string' }`, so the document stays valid when middleware handles it.
- **`operationIdStrategy: 'method'`** (default): `Ucfirst(methodName)`; a repeat gets `_2`, `_3`, ... in emission order, so adding or reordering controllers can shift ids.
- **`operationIdStrategy: 'path'`**: the lowercase verb plus the URL segments, `{param}` becoming `By<Param>` and non-alphanumerics acting as separators (`/users/by-id` gives `getUsersById`). Two paths that normalise to the same id still get the `_2` backstop.
- An explicit `method.operationId` from the metadata wins over both strategies.
- Hidden controllers and methods are skipped. Two operations on the same URL and verb log `[trapi] duplicate operation ...` with `console.warn`, and the later one replaces the earlier.

Details and more examples: [Operation IDs](https://trapi.tada5hi.net/guide/swagger-document-data#operation-ids).

## Configuration

```typescript
import type { Metadata } from '@trapi/core';
import type { SwaggerGenerateData, Version } from '@trapi/swagger';

type SwaggerGenerateOptions = {
    version: `${Version}`;       // 'v2' | 'v3' | 'v3.1' | 'v3.2'
    metadata: Metadata;          // pre-built, from any producer
    data?: SwaggerGenerateData;  // document-level content
};
```

`data` fields:

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `name` | `string` | `'Documentation'` | `info.title` |
| `version` | `string` | `'1.0.0'` | `info.version` |
| `description` | `string` | none | `info.description` |
| `license` | `string` | none | `info.license.name` |
| `servers` | `string \| string[] \| ServerOption \| ServerOption[]` | none | v3: `servers` (`{ url, description? }`). v2: the first entry's host becomes `host`, its path `basePath` |
| `securityDefinitions` | `SecurityDefinitions` | none | [Security definitions](#security-definitions) |
| `consumes` | `string[]` | none | v2: document-level `consumes`. v3: request media type fallback |
| `produces` | `string[]` | none | v2: document-level `produces`. v3: response media type fallback |
| `responses` | `Response[]` (from `@trapi/core`) | none | Added to every operation; a method's own response with the same `status` wins |
| `pathParameters` | `Record<string, { description?: string }>` | none | Descriptions for path-template variables, keyed by variable name. Used for synthesized variables and for declared ones without a description |
| `collectionFormat` | `'csv' \| 'ssv' \| 'tsv' \| 'pipes' \| 'multi'` | `'multi'` | v2 only: format of array query and formData parameters without their own |
| `operationIdStrategy` | `'method' \| 'path'` | `'method'` | [Paths and operation ids](#paths-and-operation-ids) |
| `extra` | `Record<string, any>` | none | Merged into the finished document |

```typescript
import type { RefObjectType } from '@trapi/core';

const errorResponse: RefObjectType = {
    typeName: 'refObject', refName: 'ErrorResponse', properties: [], deprecated: false,
};

await generateSwagger({
    version: 'v3.1',
    metadata,
    data: {
        name: 'Roles API',
        version: '2.0.0',
        servers: [{ url: 'https://api.example.com', description: 'Production' }],
        securityDefinitions: {
            bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        responses: [{
            name: 'default',
            status: 'default',
            description: 'Error',
            schema: errorResponse,
        }],
        pathParameters: { realmId: { description: 'The realm, by id or name.' } },
        operationIdStrategy: 'path',
        extra: { components: { schemas: { ErrorResponse: { type: 'object' } } } },
    },
});
```

- **`extra`** is a raw fragment merged onto the generated output. Generated properties take precedence where keys overlap, so `extra` adds (`x-*` extensions, components your metadata does not contain) but cannot override. It is applied before anything knows the emitted paths; for per-operation edits, post-process the returned object.
- **`responses`** are `Response` objects, not OpenAPI fragments, so one config serves every version. A `$ref` may name a type the metadata does not contain; supply the schema through `extra` as above.
- **`info`** is never read from `package.json`: pass `name` and `version` explicitly.

More examples per field: [Document Data](https://trapi.tada5hi.net/guide/swagger-document-data).

## Saving to disk

<p align="center"><img src="./assets/save-swagger.svg" width="960" alt="saveSwagger(spec, { cwd: './docs', name: 'openapi.json', format: 'yaml' }) replaces the .json suffix with .yaml, resolves ./docs against process.cwd() and creates it, serialises the spec with locter's YAMLWriter, writes the file and returns DocumentFormatData with the absolute path, the file name and the content. Defaults: cwd process.cwd(), name swagger, format json."></p>

`saveSwagger()` writes the spec to `cwd/name.{format}`. Each call writes exactly one file: call it twice if you want both JSON and YAML. It returns the `DocumentFormatData` (`path`, `name`, `content`) of the written file.

```typescript
const written = await saveSwagger(spec, {
    cwd: './docs',       // default: process.cwd(); relative paths resolve against it, created if missing
    name: 'openapi',     // default: 'swagger'; a trailing .json/.yaml/.yml is replaced to match format
    format: 'yaml',      // 'json' | 'yaml'; default: 'json'
});

console.log(`Wrote ${written.name} to ${written.path}`);
```

- JSON is written with four-space indentation; YAML through `locter`'s `YAMLWriter`.
- `saveSwagger()` does not validate the document.
- If you need in-memory output only, skip `saveSwagger()` and use the value returned by `generateSwagger()` directly.

More patterns (both formats, one file per version): [Saving Output](https://trapi.tada5hi.net/guide/swagger-output).

## API

| Export | Kind | Purpose |
| --- | --- | --- |
| `generateSwagger(options)` | function | Emit a `SpecV2` or `SpecV3` from `Metadata` |
| `saveSwagger(spec, options?)` | function | Write one JSON or YAML file, returns `DocumentFormatData` |
| `SwaggerGenerateOptions`, `SwaggerGenerateData`, `ServerOption`, `PathParameterOption` | types | Input of `generateSwagger` |
| `SwaggerSaveOptions`, `DocumentFormatData` | types | Input and result of `saveSwagger` |
| `SpecV2`, `SpecV3` | types | Shapes of the emitted documents (`SpecV3` covers 3.0, 3.1 and 3.2) |
| `OutputForVersion<V>` | type | `SpecV2` for `'v2'`, `SpecV3` otherwise |
| `Version`, `DocumentFormat`, `OperationIdStrategy`, `SecurityType` | const + type | Closed value sets (`Version.V3_1 === 'v3.1'`) |
| `SecurityDefinitions`, `SecurityDefinition`, `ApiKeySecurity`, `HttpSecurity`, `BasicSecurity`, `BearerSecurity`, `OAuth2Security` | types | Shape of `data.securityDefinitions` |
| `ValidatorOpenApiMeta` | type | OpenAPI hint a preset can attach to a validator (see [Notes](#notes)) |
| `SwaggerError`, `SwaggerErrorCode` | class, const | [Errors](#errors) |
| `V2Generator`, `V3Generator` | classes | The emitters behind `generateSwagger`; treat as internal |

The full reference, including the stable-surface contract, is the [API Reference](https://trapi.tada5hi.net/guide/swagger-api-reference).

## Errors

All errors are `SwaggerError` instances (from `@ebec/core`'s `BaseError`) carrying a `code`:

| `SwaggerErrorCode` | Value | Thrown when |
| --- | --- | --- |
| `METADATA_INVALID` | `SWAGGER_METADATA_INVALID` | `options.metadata` is not `{ controllers: [], referenceTypes: {} }`-shaped |
| `BODY_PARAMETER_DUPLICATE` | `SWAGGER_BODY_PARAMETER_DUPLICATE` | A method has more than one body parameter |
| `BODY_FORM_CONFLICT` | `SWAGGER_BODY_FORM_CONFLICT` | A method mixes a body or body property with form parameters |
| `BODY_PROP_TYPE_CONFLICT` | `SWAGGER_BODY_PROP_TYPE_CONFLICT` | Body properties sit next to a body type with no object shape, or a `refObject` body that `referenceTypes` cannot resolve |
| `ENUM_UNSUPPORTED_TYPE` | `SWAGGER_ENUM_UNSUPPORTED_TYPE` | An enum has members other than string, number, boolean or `null` |
| `PARAMETER_SOURCE_UNSUPPORTED` | `SWAGGER_PARAMETER_SOURCE_UNSUPPORTED` | A parameter source has no equivalent in the target version |
| `SPEC_NOT_BUILT` | `SWAGGER_SPEC_NOT_BUILT` | Reserved; not thrown by the current emitters |

```typescript
import { SwaggerError, SwaggerErrorCode, generateSwagger } from '@trapi/swagger';

try {
    await generateSwagger({ version: 'v3', metadata });
} catch (e) {
    if (e instanceof SwaggerError && e.code === SwaggerErrorCode.BODY_FORM_CONFLICT) {
        // a method declares both @Body and form fields
    }
}
```

## Notes

- **The whole query bag is dropped.** A parameter with `in: 'query'` describes the entire query object, which OpenAPI cannot express; both emitters build parameters from `path`, `queryProp`, `header`, `formData` and (v3) `cookie` only. `@trapi/metadata` already turns supported query parameters into `queryProp`.
- **Validators need a mapping.** `maxLength`, `minLength`, `maximum`, `minimum`, `pattern`, `maxItems`, `minItems` and `uniqueItems` map to the same-named keywords. Any other validator is left out unless the preset attached `meta.openApi`: `{ kind: 'keyword', key }`, `{ kind: 'format', format }` or `{ kind: 'ignore' }`.
- **Controller settings cascade.** Tags, `consumes`, `produces` and responses are merged onto each method, a method without security inherits the controller's, and a deprecated controller marks every operation deprecated (OpenAPI has no controller-level flag).
- **Tag entries** are emitted only for controllers that declare extensions; tags themselves appear on the operations.
- **`x-` extensions** from the metadata are prefixed with `x-` when the key lacks it.
- **Spec compliance** is covered by the package tests, which validate v2, v3.0 and v3.1 output against the official OpenAPI JSON Schemas. Your own document is not validated at runtime.

## Structure

```
src/
├── core/         # Config and options types, constants, OpenAPI schema types, errors, utils
│   ├── config/
│   ├── error/
│   ├── schema/v2, v3
│   └── utils/    # operation ids, path normalisation
├── adapters/     # Emitters
│   └── generator/abstract.ts, v2/, v3/
├── app/          # generateSwagger (module.ts), saveSwagger (save.ts)
└── index.ts      # Public entry point
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
