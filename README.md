<p align="center"><img src=".github/assets/logo.svg" width="160" height="160" alt="Decorated TypeScript passes through an aperture into an API specification, the approved TRAPI mark"></p>
<h1 align="center">TRAPI</h1>
<p align="center"><strong>Generate API metadata and OpenAPI documents from decorated TypeScript.</strong></p>
<p align="center">Keep your framework's decorators. Describe their meaning with a preset, then reuse the extracted metadata.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/metadata"><img src="https://img.shields.io/npm/v/%40trapi%2Fmetadata" alt="Metadata package version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-trapi">Why</a> · <a href="#packages">Packages</a> · <a href="#installation">Installation</a> · <a href="#usage">Usage</a> · <a href="#custom-presets">Custom presets</a> · <a href="#documentation">Documentation</a></p>

---

## Why TRAPI?

Your routes and types already live in TypeScript. TRAPI reads them through a decorator mapping so you can generate documentation without maintaining a second route/schema model.

| Concern | Without a shared extraction pipeline | With TRAPI |
| --- | --- | --- |
| Framework decorators | A generator can require its own annotation set | A preset maps your decorator names into a framework-neutral model |
| Multiple document targets | Repeat source analysis or maintain separate generators | Extract `Metadata` once and emit multiple OpenAPI versions/formats |
| Build-time control | Documentation generation is tied to starting the application | Analyse TypeScript source, then run the emitter as a separate build step |
| Mapping mistakes | Unrecognised decorators can silently disappear from documentation | Opt into unmatched-decorator reporting or `strict: 'throw'` |

<p align="center"><img src=".github/assets/metadata-flow.svg" width="960" alt="generateMetadata analyses decorated TypeScript with preset handlers and returns controllers plus referenceTypes. Reuse that Metadata with generateSwagger for OpenAPI 2.0, 3.0, 3.1 or 3.2, then save one JSON or YAML file per call."></p>

`@trapi/swagger` consumes the metadata contract without depending on the TypeScript compiler. Controller extraction and document emission are separate operations.

## Packages

| Package | Version | Purpose |
| --- | --- | --- |
| [@trapi/core](packages/core) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fcore)](https://www.npmjs.com/package/@trapi/core) | Metadata contracts, handler builders and preset machinery |
| [@trapi/metadata](packages/metadata) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fmetadata)](https://www.npmjs.com/package/@trapi/metadata) | TypeScript source analysis and metadata extraction |
| [@trapi/swagger](packages/swagger) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fswagger)](https://www.npmjs.com/package/@trapi/swagger) | OpenAPI 2.0, 3.0, 3.1 and 3.2 emitters, JSON/YAML saving |
| [@trapi/preset-decorators-express](packages/preset-decorators-express) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fpreset-decorators-express)](https://www.npmjs.com/package/@trapi/preset-decorators-express) | Mapping for `@decorators/express`, TRAPI markers and JSDoc |
| [@trapi/preset-typescript-rest](packages/preset-typescript-rest) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fpreset-typescript-rest)](https://www.npmjs.com/package/@trapi/preset-typescript-rest) | Mapping for `typescript-rest`, TRAPI markers and JSDoc |
| [@trapi/cli](packages/cli) | [![npm](https://img.shields.io/npm/v/%40trapi%2Fcli)](https://www.npmjs.com/package/@trapi/cli) | Generate documents from flags or a configuration file |

## Installation

For an existing application using `@decorators/express`:

```bash
npm install --save-dev @trapi/metadata @trapi/swagger @trapi/preset-decorators-express
```

The framework's runtime decorators belong to your application. Use `@trapi/preset-typescript-rest` for `typescript-rest`, or define a mapping for another decorator library.

Packages expose ESM entry points. The Swagger and CLI package manifests require Node 24+; metadata extraction retains its documented Node 22 compatibility. Contributor tooling requires Node 24.11+ on the 24.x line or Node 26+. Package-specific requirements remain in their manifests.

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

This writes `docs/openapi-v3.1.json` and `docs/openapi-v3.2.json`. Use `format: 'yaml'` for YAML. Each `saveSwagger` call writes one file, creating the destination directory if needed.

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

The output extension selects JSON or YAML unless `--format` overrides it. For multiple targets, transforms or watch mode, use the [CLI guide](https://trapi.tada5hi.net/guide/cli).

## Custom presets

A handler matches an annotation and mutates its draft. This preset adds a `@Route(...)` controller annotation while inheriting the shipped Express mapping:

```typescript
import { controller } from '@trapi/core';
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
} satisfies Preset;
```

Pass this object through `generateMetadata({ entryPoint, preset })`, or resolve a preset module by name/path. Presets compose via `extends`; JSDoc handlers use the parallel controller/method/parameter JSDoc collections. Read [preset authoring](https://trapi.tada5hi.net/guide/advanced-custom-presets) for replacement and ordering rules.

## Options

Selected metadata options, checked against `MetadataGenerateOptions`:

| Option | Default | Purpose |
| --- | --- | --- |
| `entryPoint` | Required | Source glob(s) or structured entry-point options |
| `preset` | Unset | Preset package/path or inline preset object |
| `registry` | Unset | Append already-resolved handlers after the preset's handlers |
| `tsconfig` | Unset | TypeScript configuration path or parsed configuration object |
| `cache` | Off | Enable or configure metadata caching |
| `strict` | `false` | `true` reports unmatched decorators; `'throw'` makes them an error |
| `onUnmatchedDecorator` | Unset | Receive unmatched reports instead of the built-in warning/error action |

These are extraction options, not HTTP server settings. Full option/API references are linked below.

## Documentation

- [Quick start](https://trapi.tada5hi.net/guide/quick-start) and [framework integration](https://trapi.tada5hi.net/guide/framework-integration)
- [Metadata configuration](https://trapi.tada5hi.net/guide/metadata-configuration) and [public API](https://trapi.tada5hi.net/guide/metadata-api-reference)
- [Swagger generation](https://trapi.tada5hi.net/guide/swagger-generation), [document data](https://trapi.tada5hi.net/guide/swagger-document-data) and [public API](https://trapi.tada5hi.net/guide/swagger-api-reference)
- [Supported TypeScript types](https://trapi.tada5hi.net/guide/advanced-type-support) and [custom presets](https://trapi.tada5hi.net/guide/advanced-custom-presets)

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
