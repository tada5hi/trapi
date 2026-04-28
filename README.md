# TRAPI

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)

**T**ypeScript **R**est **API** generates OpenAPI specifications and API metadata from TypeScript decorators — without locking you into a specific decorator library.

## Why TRAPI?

Most tools that generate OpenAPI from decorators force you to adopt their own decorator set. TRAPI takes a different approach: **bring your own decorators**. You define a mapping from your framework's decorators to TRAPI's metadata model, and TRAPI handles the rest.

- **Decorator-agnostic** — works with any decorator-based HTTP framework (Express, Koa, Fastify, or your own)
- **Pure static analysis** — decorators are no-ops at runtime; metadata is extracted via the TypeScript compiler API
- **Zero runtime overhead** — all work happens at build time, nothing is added to your application
- **Framework presets** — ships with presets for [typescript-rest](https://github.com/thiagobustamante/typescript-rest) and [@decorators/express](https://github.com/serhiisol/node-decorators), or create your own
- **OpenAPI 2.0, 3.0, 3.1 & 3.2** — generates spec-compliant JSON/YAML output

## Packages

| Package | Description |
|---------|-------------|
| [@trapi/metadata](./packages/metadata) | Core: extracts API metadata from TypeScript decorators |
| [@trapi/swagger](./packages/swagger) | Transforms metadata into OpenAPI 2.0, 3.0, 3.1 & 3.2 specifications |
| [@trapi/decorators](./packages/decorators) | TRAPI-specific markers (`@Hidden`, `@Tags`, `@Description`, `@IsInt`, …) — base preset both framework presets extend |
| [@trapi/preset-typescript-rest](./packages/preset-typescript-rest) | Preset for typescript-rest |
| [@trapi/preset-decorators-express](./packages/preset-decorators-express) | Preset for @decorators/express |
| [@trapi/cli](./packages/cli) | `trapi` CLI — generate OpenAPI specs straight from the shell |

## Quick Start

```bash
npm install @trapi/metadata @trapi/swagger
```

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

// Extract metadata from your decorated TypeScript source
const metadata = await generateMetadata({
    entryPoint: './src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
});

// Generate OpenAPI spec
const spec = await generateSwagger({
    version: 'v3',
    metadata,
    data: { name: 'My API', version: '1.0.0' },
});

// Write spec to disk
await saveSwagger(spec, { cwd: './docs' });
```

Or skip the script entirely and run it from the shell with [`@trapi/cli`](./packages/cli):

```bash
npx trapi generate \
  --preset @trapi/preset-decorators-express \
  --entry-point 'src/**/*.ts' \
  --output docs/openapi.json \
  --version 3.1
```

## How It Works

TRAPI uses the TypeScript compiler API to statically analyze your source code. It reads decorator metadata from the AST — no `reflect-metadata`, no runtime type information.

```text
TypeScript Source Code  -->  Metadata Extraction  -->  OpenAPI Specification
   (your decorators)        (@trapi/metadata)          (@trapi/swagger)
```

A **preset** is a collection of **handlers** that match decorators by name and mutate a draft (controller, method, parameter, ...). Each handler declares what it matches and how it contributes:

```typescript
import { controller, method } from '@trapi/metadata';

const controllerHandler = controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => {
        const arg = ctx.argument(0);
        if (typeof arg?.raw === 'string') {
            draft.path = arg.raw;
        }
    },
});

const getHandler = method({
    match: { name: 'Get', on: 'method' },
    apply: (ctx, draft) => {
        draft.method = 'get';
        const arg = ctx.argument(0);
        if (typeof arg?.raw === 'string') {
            draft.path = arg.raw;
        }
    },
});

export default {
    name: 'my-preset',
    controllers: [controllerHandler],
    methods: [getHandler],
    parameters: [/* ... */],
};
```

Presets can `extend` other presets to inherit and override handlers — `@trapi/preset-decorators-express` extends `@trapi/decorators` and only overrides the names that diverge. JSDoc tags use the same model through dedicated `controllerJsDoc` / `methodJsDoc` / `parameterJsDoc` handler arrays.

This means any HTTP framework built on TypeScript decorators can get metadata extraction and OpenAPI generation for free — without changing application code.

## Documentation

The full docs live at [https://trapi.tada5hi.net](https://trapi.tada5hi.net). Highlights:

- **[Quick Start](https://trapi.tada5hi.net/guide/quick-start)** — get an OpenAPI spec on disk in five minutes
- **[Key Concepts](https://trapi.tada5hi.net/guide/concepts)** — the mental model: decorators, mappings, metadata, emitters
- **[Framework Integration](https://trapi.tada5hi.net/guide/framework-integration)** — using TRAPI with typescript-rest, @decorators/express, or your own decorators
- **[CLI](https://trapi.tada5hi.net/guide/cli)** — `trapi generate` from the shell, no script required
- **[Supported TypeScript Types](https://trapi.tada5hi.net/guide/advanced-type-support)** — what the resolver understands
- **[Custom Presets](https://trapi.tada5hi.net/guide/advanced-custom-presets)** — publish a decorator mapping others can reuse
- **[API Reference](https://trapi.tada5hi.net/guide/metadata-api-reference)** — stable public surface for both packages

## License

Made with 💚

Published under [MIT License](./LICENSE).
