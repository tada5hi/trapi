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
- **OpenAPI 2.0 & 3.0** — generates spec-compliant JSON/YAML output

## Packages

| Package | Description |
|---------|-------------|
| [@trapi/metadata](./packages/metadata) | Core: extracts API metadata from TypeScript decorators |
| [@trapi/swagger](./packages/swagger) | Transforms metadata into OpenAPI 2.0/3.0 specifications |
| [@trapi/decorators](./packages/decorators) | Default decorator set and mapping |
| [@trapi/preset-typescript-rest](./packages/preset-typescript-rest) | Preset for typescript-rest |
| [@trapi/preset-decorators-express](./packages/preset-decorators-express) | Preset for @decorators/express |

## Quick Start

```bash
npm install @trapi/metadata @trapi/swagger
```

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generate } from '@trapi/swagger';

// Extract metadata from your decorated TypeScript source
const metadata = await generateMetadata({
    entryFile: './src/controllers/**/*.ts',
    preset: '@trapi/decorators',
});

// Generate OpenAPI spec
await generate({
    metadata,
    output: { directory: './docs' },
    spec: { info: { title: 'My API', version: '1.0.0' } },
});
```

## How It Works

TRAPI uses the TypeScript compiler API to statically analyze your source code. It reads decorator metadata from the AST — no `reflect-metadata`, no runtime type information.

```
TypeScript Source Code  -->  Metadata Extraction  -->  OpenAPI Specification
   (your decorators)        (@trapi/metadata)          (@trapi/swagger)
```

A **preset** maps your decorator names to TRAPI's internal concepts (controller, HTTP method, parameter source, etc.):

```typescript
{
    [DecoratorID.CONTROLLER]: { name: 'Controller' },
    [DecoratorID.GET]: { name: 'Get' },
    [DecoratorID.BODY]: { name: 'Body' },
    // ...
}
```

This means any HTTP framework built on TypeScript decorators can get metadata extraction and OpenAPI generation for free — without changing application code.

## Documentation

To read the full docs, visit [https://trapi.tada5hi.net](https://trapi.tada5hi.net)

## License

Made with 💚

Published under [MIT License](./LICENSE).
