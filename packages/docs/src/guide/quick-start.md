# Quick Start

A minimal end-to-end example: install the packages, decorate a controller, generate an OpenAPI 3.0 spec and write it to disk.

## 1. Install

```bash
npm install --save @trapi/metadata @trapi/swagger @trapi/preset-decorators-express @decorators/express
```

`@decorators/express` provides the runtime decorators (`@Controller`, `@Get`, `@Post`, …); `@trapi/preset-decorators-express` is the self-contained preset that teaches TRAPI how to read them and also handles TRAPI marker decorators (`@Hidden`, `@Tags`, `@Description`, `@IsInt`, …). If your application already uses `typescript-rest`, install `@trapi/preset-typescript-rest` instead. For any other library, [define a custom preset](/guide/advanced-custom-presets).

## 2. Write a Controller

```typescript
// src/controllers/user.controller.ts
import { Controller, Get, Post, Body, Params } from '@decorators/express';

type User = {
    id: string;
    name: string;
    email: string;
};

type CreateUserInput = {
    name: string;
    email: string;
};

@Controller('/users')
export class UserController {
    @Get('/:id')
    async findOne(@Params('id') id: string): Promise<User> {
        // implementation not visible to TRAPI — this is build-time analysis only
        return {} as User;
    }

    @Post('/')
    async create(@Body() input: CreateUserInput): Promise<User> {
        return {} as User;
    }
}
```

Decorators are no-ops at runtime. Their bodies never run as part of metadata extraction — only the compile-time annotations are read.

## 3. Generate a Spec

```typescript
// scripts/generate-openapi.ts
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const spec = await generateSwagger({
    version: 'v3',
    metadata: {
        entryPoint: ['src/controllers/**/*.ts'],
        preset: '@trapi/preset-decorators-express',
    },
    data: {
        name: 'Example API',
        version: '1.0.0',
        servers: 'http://localhost:3000',
    },
});

await saveSwagger(spec, { cwd: './docs', format: 'yaml' });
```

Run the script:

```bash
npx tsx scripts/generate-openapi.ts
```

`./docs/swagger.yaml` is now on disk. Drop `format: 'yaml'` (or set `format: 'json'`) for JSON output instead — one `saveSwagger()` call writes one file. Call it twice if you want both.

## 4. Hook It into Your Build

A common setup is to make spec generation part of `npm run build` so the committed docs never drift from the code. For a CI-friendly shape, split metadata extraction and OpenAPI emission:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
    cache: true,
});

for (const version of ['v2', 'v3'] as const) {
    const spec = await generateSwagger({
        version,
        metadata,
        data: { name: 'Example API', version: '1.0.0' },
    });

    for (const format of ['json', 'yaml'] as const) {
        await saveSwagger(spec, {
            cwd: './docs',
            name: `openapi-${version}`,
            format,
        });
    }
}
```

The metadata is produced once and reused for every emitter.

## Next Steps

- Using an existing framework? See [Framework Integration](/guide/framework-integration).
- Want to know every option on the metadata side? [Metadata Configuration](/guide/metadata-configuration).
- Want to shape the OpenAPI output? [Document Data](/guide/swagger-document-data).
