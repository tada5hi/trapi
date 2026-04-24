# Installation

Add the package as a dependency:

```bash
npm install --save @trapi/metadata
```

## Peer Requirements

- **Node.js** ≥ 22
- **TypeScript** ≥ 5 — required at runtime because TRAPI drives the TypeScript compiler API to analyse your source. The version from your project is used; TRAPI does not bundle one.

TypeScript is declared as a peer dependency, so your project's `typescript` version is the one TRAPI will use.

## Module Format

`@trapi/metadata` is an ESM-only package. Your project must either set `"type": "module"` in `package.json` or load it via dynamic `import()` from CommonJS.

## Bundled With…

You normally install it alongside either `@trapi/swagger` (if you want OpenAPI output) or a consumer you've written yourself:

```bash
# Typical setup
npm install --save @trapi/metadata @trapi/swagger @trapi/decorators
```

- `@trapi/decorators` — reference decorator set (or use a [preset](/guide/metadata-decorators#presets))
- `@trapi/swagger` — OpenAPI emitter

## Verify

Once installed, a minimal smoke test:

```typescript
import { generateMetadata } from '@trapi/metadata';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/decorators',
});

console.log(metadata.controllers.length, 'controller(s) discovered');
```

If that runs without errors, continue to [Configuration](/guide/metadata-configuration).
