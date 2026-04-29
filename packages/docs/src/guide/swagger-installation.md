# Installation

Add the package as a dependency:

```bash
npm install --save @trapi/swagger
```

## Requirements

- **Node.js** ≥ 22
- **TypeScript** ≥ 5 — required through `@trapi/metadata`, which uses the compiler API at runtime.

`@trapi/metadata` is a direct dependency of `@trapi/swagger`, so installing swagger pulls it in transitively. Install it explicitly too if you want to import its types (`Metadata`, `MetadataGenerateOptions`) in your own code:

```bash
npm install --save @trapi/metadata
```

If you want `@trapi/swagger` to run metadata extraction itself (by passing `MetadataGenerateOptions` to `generateSwagger`), you also need a decorator mapping installed — a shipped preset (`@trapi/preset-decorators-express` or `@trapi/preset-typescript-rest`), or your own:

```bash
npm install --save @trapi/preset-decorators-express @decorators/express
```

## Module Format

ESM-only. Same caveat as `@trapi/metadata`: set `"type": "module"` in your `package.json` or load via dynamic `import()` from CommonJS.

## Verify

```typescript
import { generateSwagger } from '@trapi/swagger';

const spec = await generateSwagger({
    version: 'v3',
    metadata: {
        entryPoint: 'src/controllers/**/*.ts',
        preset: '@trapi/preset-decorators-express',
    },
    data: { name: 'My API', version: '1.0.0' },
});

console.log(spec.openapi);  // '3.0.0'
```

Once that runs, continue to [Generating a Spec](/guide/swagger-generation).
