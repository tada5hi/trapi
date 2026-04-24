# Saving Output

`saveSwagger()` writes an in-memory spec to disk as a single JSON or YAML file. Call it twice if you need both formats.

```typescript
import { saveSwagger } from '@trapi/swagger';

await saveSwagger(spec, {
    cwd: './docs',
    name: 'openapi',
    format: 'yaml',
});
```

## Options

```typescript
import type { SwaggerSaveOptions, DocumentFormat } from '@trapi/swagger';

type SwaggerSaveOptions = {
    cwd?: string;                    // default: process.cwd()
    name?: string;                   // default: 'swagger'
    format?: `${DocumentFormat}`;    // 'json' | 'yaml' — default: 'json'
};
```

- **`cwd`** — the working directory the file is written into. Relative paths resolve against `process.cwd()`; the directory is created recursively if missing.
- **`name`** — base filename. Extensions are optional: `'openapi'`, `'openapi.json'`, and `'openapi.yaml'` all behave the same — any trailing `.json` or `.yaml` is stripped and replaced with the one that matches `format`.
- **`format`** — either the literal `'json'`/`'yaml'` or `DocumentFormat.JSON`/`DocumentFormat.YAML` from `@trapi/swagger`.

## Return Value

`saveSwagger()` returns the `DocumentFormatData` for the written file:

```typescript
interface DocumentFormatData {
    path: string;       // absolute path to the written file
    name: string;       // filename with extension, e.g. 'openapi.yaml'
    content?: string;   // serialised content (JSON or YAML string)
}
```

```typescript
const written = await saveSwagger(spec, { cwd: './docs', format: 'yaml' });

console.log(`Wrote ${written.name} to ${written.path}`);
```

Useful when you want to upload the produced file to an artefact store or post-process it without re-reading from disk.

## Writing Both Formats

`saveSwagger()` writes a single file per call. For both JSON and YAML, call it twice:

```typescript
await saveSwagger(spec, { cwd: './docs', format: 'json' });
await saveSwagger(spec, { cwd: './docs', format: 'yaml' });
```

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

    for (const format of ['json', 'yaml'] as const) {
        await saveSwagger(spec, { cwd: './docs', name: `openapi-${version}`, format });
    }
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
