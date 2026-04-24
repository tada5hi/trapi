# Saving Output

`saveSwagger()` writes an in-memory spec to disk as JSON, and optionally YAML.

```typescript
import { saveSwagger } from '@trapi/swagger';

await saveSwagger(spec, {
    directory: './docs',
    fileName: 'openapi',
    yaml: true,
});
```

## Options

```typescript
type SwaggerGenerateOutput = {
    directory?: string;  // default: process.cwd()
    fileName?: string;   // default: 'swagger'
    yaml?: boolean;      // default: false
};
```

- **`directory`** — created recursively if it does not exist.
- **`fileName`** — base name without extension. JSON always emits as `${fileName}.json`; YAML as `${fileName}.yaml` when enabled.
- **`yaml`** — when `true`, writes both JSON and YAML.

## Return Value

`saveSwagger()` returns a record keyed by filename:

```typescript
{
    'openapi.json': { path: '...', name: 'openapi.json', content: '...' },
    'openapi.yaml': { path: '...', name: 'openapi.yaml', content: '...' },
}
```

Useful when you want to upload the produced files to an artefact store or post-process them.

## Picking a Location

- **Committed docs:** write to `./docs/` or similar and commit the output. Works well when you want the spec reviewable in pull requests.
- **Build artefact:** write to `./dist/openapi/` alongside your bundle.
- **Ephemeral:** write to `os.tmpdir()` when the spec is only needed for one downstream step.

## Splitting by Version

Emitting multiple versions usually means distinct filenames per version:

```typescript
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger, saveSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({ entryPoint: 'src/**/*.controller.ts', preset: '@trapi/decorators' });

for (const version of ['v2', 'v3'] as const) {
    const spec = await generateSwagger({ version, metadata, data: { name: 'API', version: '1.0.0' } });
    await saveSwagger(spec, { directory: './docs', fileName: `openapi-${version}`, yaml: true });
}
```

## Skipping the Helper

`saveSwagger()` is a convenience — nothing stops you from writing the spec yourself:

```typescript
import fs from 'node:fs/promises';

await fs.writeFile('./docs/openapi.json', JSON.stringify(spec, null, 2), 'utf-8');
```

Use it when you want control over indentation, filename conventions, or when serialising to a non-standard format.

## Validating the Output

`saveSwagger()` does not validate. If you want a CI check against the official OpenAPI JSON Schemas, pair it with a validator:

```typescript
import { generateSwagger } from '@trapi/swagger';
import Ajv from 'ajv';
import schema from './openapi-3.0-schema.json' with { type: 'json' };

const spec = await generateSwagger({ version: 'v3', metadata, data: { name: 'API', version: '1.0.0' } });
const ajv = new Ajv();
const validate = ajv.compile(schema);

if (!validate(spec)) {
    console.error(validate.errors);
    process.exit(1);
}
```

The TRAPI test suite itself already validates generated specs against the official JSON Schemas on every build, so this is more of a defensive safety net than a routine need.
