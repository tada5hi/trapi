# Installation

Add the package as a dependency:

```bash
npm install --save @trapi/swagger
```

## Peer Requirements

- **Node.js** ≥ 22
- **`@trapi/metadata`** — the swagger package operates on metadata, so you need this installed alongside it:

```bash
npm install --save @trapi/metadata
```

If you also want `@trapi/swagger` to run metadata extraction on your behalf (by passing options to `generateSwagger` instead of a pre-built `Metadata` object), install a decorator mapping too:

```bash
npm install --save @trapi/decorators
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
        preset: '@trapi/decorators',
    },
    data: { name: 'My API', version: '1.0.0' },
});

console.log(spec.openapi);  // '3.0.0'
```

Once that runs, continue to [Generating a Spec](/guide/swagger-generation).
