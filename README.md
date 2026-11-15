<p align="center"><img src=".github/assets/logo.svg" width="160" height="160" alt="TRAPI logo: the letter T inside a pair of generic type brackets"></p>
<h1 align="center">TRAPI</h1>
<p align="center"><strong>Generate API metadata and OpenAPI documents from decorated TypeScript.</strong></p>
<p align="center">Keep your framework's decorators. Describe their meaning with a preset, then reuse the extracted metadata.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/metadata"><img src="https://img.shields.io/npm/v/%40trapi%2Fmetadata" alt="Metadata package version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-trapi">Why</a> · <a href="#packages">Packages</a> · <a href="#installation">Installation</a> · <a href="#usage">Usage</a> · <a href="#how-it-works">How it works</a> · <a href="#custom-presets">Custom presets</a> · <a href="#options">Options</a> · <a href="#documentation">Documentation</a></p>

---

## Why TRAPI?

Your routes and types already live in TypeScript. TRAPI reads them through a decorator mapping so you can generate documentation without maintaining a second route/schema model.

| Concern | Without a shared extraction pipeline | With TRAPI |
| --- | --- | --- |
| Framework decorators | A generator can require its own annotation set | A preset maps your decorator names into a framework-neutral model |
| Multiple document targets | Repeat source analysis or maintain separate generators | Extract `Metadata` once and emit multiple OpenAPI versions/formats |
| Build-time control | Documentation generation is tied to starting the application | Analyse TypeScript source, then run the emitter as a separate build step |
| Mapping mistakes | Unrecognised decorators can silently disappear from documentation | Opt into unmatched-decorator reporting or `strict: 'throw'` |

The controller below is all the input TRAPI needs. `generateMetadata` turns it into a framework-neutral `Metadata` object, and `generateSwagger` turns that into an OpenAPI path entry. The values in the picture are the real output of the shipped packages for this file.

<p align="center"><img src=".github/assets/controller-to-openapi.svg" width="960" alt="A @decorators/express controller declares @Controller('/users') and @Get('/:id') on findOne(@Params('id') id: string, @Query('expand') expand?: string): Promise&lt;User&gt;. With @trapi/preset-decorators-express, generateMetadata returns a controller with paths ['users'] and a get method at path ':id' whose parameters are { in: 'path', name: 'id', required: true } and { in: 'queryProp', name: 'expand' }; the return type is a refAlias to User, which is also listed in referenceTypes. generateSwagger with version v3.1 turns ':id' into '{id}', queryProp into in: query and the alias into a $ref, and emits paths./users/{id}.get with operationId FindOne, both parameters and a 200 response whose schema is $ref: '#/components/schemas/User'."></p>

The metadata keeps TypeScript's view of the route (`':id'`, `queryProp`, a `refAlias`); OpenAPI-specific rewriting (`{id}`, `in: query`, `$ref`) happens only in the emitter. `@trapi/swagger` consumes the metadata contract without depending on the TypeScript compiler. Controller extraction and document emission are separate operations.

## Packages

| Package | Version | Purpose |
| --- | --- | --- |
| [@trapi/core](packages/core) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fcore)](https://www.npmjs.com/package/@trapi/core) | Metadata contracts, handler builders and preset machinery |
| [@trapi/metadata](packages/metadata) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fmetadata)](https://www.npmjs.com/package/@trapi/metadata) | TypeScript source analysis and metadata extraction |
| [@trapi/swagger](packages/swagger) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fswagger)](https://www.npmjs.com/package/@trapi/swagger) | OpenAPI 2.0, 3.0, 3.1 and 3.2 emitters, JSON/YAML saving |
| [@trapi/preset-decorators-express](packages/preset-decorators-express) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fpreset-decorators-express)](https://www.npmjs.com/package/@trapi/preset-decorators-express) | Mapping for `@decorators/express`, TRAPI markers and JSDoc |
| [@trapi/preset-typescript-rest](packages/preset-typescript-rest) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fpreset-typescript-rest)](https://www.npmjs.com/package/@trapi/preset-typescript-rest) | Mapping for `typescript-rest`, TRAPI markers and JSDoc |
| [@trapi/cli](packages/cli) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fcli)](https://www.npmjs.com/package/@trapi/cli) | Generate documents from flags or a configuration file |

`@trapi/core`, `@trapi/metadata`, `@trapi/swagger` and `@trapi/cli` are released together under one version; the presets are versioned on their own.

<p align="center"><img src=".github/assets/package-map.svg" width="960" alt="@trapi/preset-decorators-express and @trapi/preset-typescript-rest have a peer dependency on @trapi/core only. @trapi/cli depends on @trapi/swagger and @trapi/metadata. @trapi/swagger depends on @trapi/core only. @trapi/metadata depends on @trapi/core and has a peer dependency on typescript 5.0.0 or later. @trapi/core holds the Metadata and Type contracts, the handler builders and the preset loader, and has no typescript dependency. Installing @trapi/swagger or a preset therefore never pulls in the TypeScript compiler; @trapi/metadata, and through it @trapi/cli, needs it."></p>

Install only what your job needs:

| You want to | Install | Pulls in `typescript`? |
| --- | --- | --- |
| Extract metadata and emit OpenAPI in a script | `@trapi/metadata`, `@trapi/swagger` and a preset | Yes, as the peer of `@trapi/metadata` |
| Run it from the command line | `@trapi/cli` and a preset | Yes, through `@trapi/metadata` |
| Emit OpenAPI from metadata you already have (cached JSON, a fixture, another extractor) | `@trapi/swagger` | No |
| Write or publish a preset | `@trapi/core` | No |

## Installation

For an existing application using `@decorators/express`:

```bash
npm install --save-dev @trapi/metadata @trapi/swagger @trapi/preset-decorators-express
```

The framework's runtime decorators belong to your application. Use `@trapi/preset-typescript-rest` for `typescript-rest`, or define a mapping for another decorator library (then also install `@trapi/core`, which supplies the authoring helpers).

All packages are ESM-only: their `exports` provide an `import` condition and no `require` condition. `@trapi/metadata` uses your project's `typescript` (peer range `>=5.0.0`) instead of bundling one. `@trapi/swagger` and `@trapi/cli` declare `node >= 24` in `engines`; `@trapi/core`, `@trapi/metadata` and the presets declare no engine range, and the metadata installation guide lists Node 22 or later. Contributor tooling requires Node 24.11+ on the 24.x line or Node 26+.

## Usage

Point `entryPoint` at your decorated controllers. In this example, the same metadata produces two documents:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
    tsconfig: 'tsconfig.json',
});

for (const version of ['v3.1', 'v3.2'] as const) {
    const spec = await generateSwagger({
        version,
        metadata,
        data: { name: 'Example API', version: '1.0.0' },
    });

    await saveSwagger(spec, {
        cwd: 'docs',
        name: `openapi-${version}`,
        format: 'json',
    });
}
```

This writes `docs/openapi-v3.1.json` and `docs/openapi-v3.2.json`. Use `format: 'yaml'` for YAML. Each `saveSwagger` call writes one file (named `swagger.json` when you pass no `name`), creating the destination directory if needed.

<p align="center"><img src=".github/assets/metadata-flow.svg" width="960" alt="generateMetadata reads the entry point with the TypeScript compiler and the preset handlers and returns Metadata: controllers plus referenceTypes such as User. generateSwagger runs once per version on that same object: 'v2' emits swagger: &quot;2.0&quot; with $ref '#/definitions/User'; 'v3', 'v3.1' and 'v3.2' emit openapi 3.0.0, 3.1.0 and 3.2.0 with $ref '#/components/schemas/User'. saveSwagger(spec, { cwd: 'docs', name: 'openapi-v3.1', format: 'yaml' }) writes docs/openapi-v3.1.yaml; each call writes one file, JSON by default."></p>

`version` accepts `'v2'`, `'v3'`, `'v3.1'` and `'v3.2'`. The emitters do not modify the `Metadata` they receive, so one object can feed every target in turn.

### CLI

Install the CLI alongside your preset, then run its local binary:

```bash
npm install --save-dev @trapi/cli @trapi/preset-decorators-express
npx trapi generate \
  --preset @trapi/preset-decorators-express \
  --entry-point 'src/controllers/**/*.ts' \
  --output docs/openapi.json \
  --version 3.1
```

The output extension selects JSON or YAML unless `--format` overrides it. `--version` accepts `2`, `3`, `3.1` and `3.2` with or without the `v` prefix. Besides `generate`, the CLI has `watch`, `info` and `cache clean` commands. For multiple targets, transforms or watch mode, use the [CLI guide](https://trapi.tada5hi.net/guide/cli).

## How it works

TRAPI uses the TypeScript compiler API to read decorators, signatures and types from the source AST. Extraction does not invoke controller decorators or require `reflect-metadata` or runtime type information. Generation runs at build time; it does not add a TRAPI runtime component to your application. Your framework's own decorators can still have runtime behavior.

<p align="center"><img src=".github/assets/build-time.svg" width="960" alt="Generation is a build step. Controller source is parsed by the TypeScript compiler and type checker, never executed: decorator calls such as @Controller('/users'), signatures such as findOne(): Promise&lt;User&gt;, type declarations, JSDoc tags and tsconfig.json are read; method bodies never run. Modules are loaded and their code runs: the preset and every preset in its extends chain, trapi.config.ts when you use the CLI, and your own script that calls generateMetadata. Not involved: the decorator runtime such as @decorators/express, reflect-metadata, and your server. The application later starts without any TRAPI code; the generated document is a static file."></p>

A preset is a named collection of handlers. A handler matches a decorator name on a class, method or parameter and mutates that node's draft; the extractor finalises the drafts into framework-neutral metadata. `@trapi/core` supplies the contracts and authoring helpers without depending on TypeScript. You can consume the metadata directly instead of emitting OpenAPI.

The shipped presets are self-contained: each includes its framework's routing mappings, TRAPI markers and JSDoc handlers, and neither extends the other. The same route written with either vocabulary ends in the same metadata:

<p align="center"><img src=".github/assets/preset-vocabulary.svg" width="960" alt="The same route is written twice. With @decorators/express names: @Controller('/users'), @Get('/:id'), @Params('id') and @Query('expand'), read by @trapi/preset-decorators-express. With typescript-rest names: @Path('/users') on the class, @GET plus @Path('/:id') on the method, @PathParam('id') and @QueryParam('expand'), read by @trapi/preset-typescript-rest. Both produce identical controllers: paths ['users'], method 'get' at path ':id', a path parameter id and a queryProp parameter expand. Controller maps to Path on a class and sets paths; Get maps to GET plus Path on a method and sets verb and path; Params maps to PathParam and sets in: 'path'; Query maps to QueryParam and sets in: 'queryProp'."></p>

A custom preset can map another decorator-based framework when its routes and types are statically representable; installing Express, Koa, Fastify or another framework alone does not supply that mapping. See [key concepts](https://trapi.tada5hi.net/guide/concepts) for the extraction, type-resolution and emission layers.

## Custom presets

This preset adds `@Route(...)` for controllers and `@HttpGet(...)` for methods while inheriting the shipped Express mappings:

```typescript
import { controller, method } from '@trapi/core';
import type { Preset } from '@trapi/core';

export default {
    name: 'example-routes',
    extends: ['@trapi/preset-decorators-express'],
    controllers: [controller({
        match: { name: 'Route', on: 'class' },
        apply(ctx, draft) {
            const argument = ctx.argument(0);

            if (typeof argument?.raw === 'string') {
                draft.paths = [argument.raw];
            }
        },
    })],
    methods: [method({
        match: { name: 'HttpGet', on: 'method' },
        apply(ctx, draft) {
            draft.verb = 'get';
            const argument = ctx.argument(0);

            if (typeof argument?.raw === 'string') {
                draft.path = argument.raw;
            }
        },
    })],
} satisfies Preset;
```

<p align="center"><img src=".github/assets/custom-preset.svg" width="960" alt="The preset example-routes extends @trapi/preset-decorators-express and adds two handlers: Route on classes and HttpGet on methods. loadRegistry puts the inherited handlers first (Controller, Get, Post, Query, Params, Body and the rest) and appends the own ones. In health.controller.ts, @Route('/health') and @HttpGet('/') are matched by the own handlers and @Query('verbose') by the inherited Query handler. The Metadata holds paths ['health'], method 'get', path '' and a queryProp parameter verbose of type boolean, which OpenAPI 3.1 emits as GET /health with a query parameter verbose of type boolean. replaces: true on an own handler would remove inherited handlers with the same match name and target."></p>

Pass this object through `generateMetadata({ entryPoint, preset })`, or resolve a preset module by name/path. Presets compose via `extends`: the parent's handlers come first and your own are appended after them. Inherited and local handlers run additively; `replaces: true` shadows matching parent handlers, while `replaces: '<presetName>'` targets one parent. Same-preset siblings remain additive. Parameter mappings live in `parameters`; JSDoc mappings use `controllerJsDoc`, `methodJsDoc` and `parameterJsDoc`; `finalizeController` and `finalizeMethod` run once per node after its handlers. Read [preset authoring](https://trapi.tada5hi.net/guide/advanced-custom-presets) for replacement and ordering rules.

## Options

Selected metadata options, checked against `MetadataGenerateOptions`:

| Option | Default | Purpose |
| --- | --- | --- |
| `entryPoint` | Required | Source glob(s) or structured entry-point options |
| `preset` | Unset | Preset package/path or inline preset object |
| `registry` | Unset | Append already-resolved handlers after the preset's handlers |
| `tsconfig` | Unset | TypeScript configuration path or parsed configuration object |
| `ignore` / `allow` | Unset | Globs of program files to skip, and globs that override `ignore` |
| `cache` | On (files in `os.tmpdir()`) | `false` disables it; a string sets the directory; an object configures `enabled`, `directoryPath`, `fileName`, `maxAgeMs` |
| `strict` | `false` | `true` reports unmatched decorators; `'throw'` makes them an error |
| `onUnmatchedDecorator` | Unset | Receive unmatched reports instead of the built-in warning/error action |

These are extraction options, not HTTP server settings. Full option/API references are linked below.

### Unmatched decorators

A decorator that no handler in the resolved registry matches contributes nothing to the metadata. By default that happens silently, which is how a typo such as `@Hiden` or an unmapped decorator from your own code drops out of the documentation:

<p align="center"><img src=".github/assets/unmatched-decorators.svg" width="960" alt="findOne carries @Get('/:id'), which the preset matches, and @Audit('read'), which no handler matches. The collected report is { name: 'Audit', target: 'method', host: { name: 'findOne', parentName: 'UserController' }, file, line: 7 }. With strict unset or false the decorator is ignored silently. strict: true prints one console.warn listing &quot;- @Audit on method 'findOne' (user.controller.ts:7)&quot;. strict: 'throw' throws a GeneratorError with code GENERATOR_STRICT_UNMATCHED_DECORATORS. onUnmatchedDecorator receives the array of reports instead, with no warning and no throw. Reporting bypasses the metadata cache; JSDoc tags are not reported."></p>

- **`strict: true`** prints one `console.warn` at the end of generation, listing each unmatched decorator with its target, host and `file:line`.
- **`strict: 'throw'`** throws a `GeneratorError` with code `GENERATOR_STRICT_UNMATCHED_DECORATORS` and the same listing as its message. Use it as a CI gate.
- **`onUnmatchedDecorator(reports)`** receives every `UnmatchedDecoratorReport` instead; setting it enables collection without `strict`, and it replaces the warning and the throw.
- Either setting bypasses the metadata cache (read and write), because a cache hit would skip the handler dispatch that finds unmatched decorators.

## Documentation

- [Quick start](https://trapi.tada5hi.net/guide/quick-start) and [framework integration](https://trapi.tada5hi.net/guide/framework-integration)
- [Metadata configuration](https://trapi.tada5hi.net/guide/metadata-configuration) and [public API](https://trapi.tada5hi.net/guide/metadata-api-reference)
- [Swagger generation](https://trapi.tada5hi.net/guide/swagger-generation), [document data](https://trapi.tada5hi.net/guide/swagger-document-data) and [public API](https://trapi.tada5hi.net/guide/swagger-api-reference)
- [Supported TypeScript types](https://trapi.tada5hi.net/guide/advanced-type-support) and [custom presets](https://trapi.tada5hi.net/guide/advanced-custom-presets)
- [CLI](https://trapi.tada5hi.net/guide/cli) and [metadata caching](https://trapi.tada5hi.net/guide/metadata-caching)

## Notes

- **Mapping is explicit.** Installing a framework does not automatically teach TRAPI its annotations. Choose or write a preset.
- **Analysis has limits.** TRAPI resolves supported TypeScript types and selected static expressions, not arbitrary runtime route-building code. Unmatched reporting covers decorators, not ordinary JSDoc tags.
- **Application code is not started.** Controller annotations are analysed from the AST. Configuration and preset modules are loaded and can execute their own code.
- **No runtime validation or routing.** Generated documentation does not enforce request validation, authenticate requests or register routes in your server.
- **Transforms need care.** The CLI accepts document transforms; transformed output is not automatically revalidated against an OpenAPI schema.

## Development

```bash
npm ci
npm run build
npm test
npm run lint
```

Use small regression fixtures for metadata/type-resolution changes. Keep the metadata contract stable across extractors and emitters, and preserve the supported consumer runtime independently of build-tool requirements.

## License

Made with 💚

Published under the [MIT License](LICENSE).
