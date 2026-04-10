# Adding a New OpenAPI Version

Checklist for integrating a new OpenAPI specification version into TRAPI.

## 1. Audit the spec changelog

Before writing any code, read the OAI release notes and identify:

- **Breaking changes** from the previous version (e.g., 3.0→3.1 removed `nullable`)
- **New keywords** (e.g., `const`, `contentMediaType`, type arrays)
- **Relaxed constraints** (e.g., 3.1 allowed `$ref` siblings)
- **JSON Schema draft** used (3.0 uses draft-04, 3.1+ uses 2020-12)

Source: https://github.com/OAI/OpenAPI-Specification/blob/main/versions/

Update `.agents/references/openapi-specification.md` with a new section for the version.

## 2. Fetch and vendor the OAI schema

```bash
# Check what schemas are available
# V3.0 and earlier: in _archive_/schemas/
# V3.1+: on spec.openapis.org

# Example for 3.1:
curl -sL "https://spec.openapis.org/oas/3.1/schema/2022-10-07" \
  -o packages/swagger/test/schemas/v3.1-schema.json

# For older versions (YAML → JSON conversion):
node -e "
const YAML = require('yamljs');
const fs = require('fs');
const schema = YAML.load('packages/swagger/test/schemas/vX.Y-schema.yaml');
fs.writeFileSync('packages/swagger/test/schemas/vX.Y-schema.json', JSON.stringify(schema, null, 2));
"
```

Note which JSON Schema draft the OAI schema uses — this determines whether to use `ajv-draft-04` or `ajv/dist/2020.js` for validation.

## 3. Add the Version enum value

In `packages/swagger/src/constants.ts`:

```typescript
export enum Version {
    V2 = 'v2',
    V3 = 'v3',
    V3_1 = 'v3.1',
    V3_2 = 'v3.2',
    // V3_3 = 'v3.3',  ← add here
}
```

## 4. Update the generator factory

In `packages/swagger/src/generator/module.ts`, add the new case to the switch:

```typescript
case Version.V3:
case Version.V3_1:
case Version.V3_2:
// case Version.V3_3:  ← add here
```

## 5. Update the V3 generator version map

In `packages/swagger/src/generator/v3/module.ts`:

```typescript
const OPENAPI_VERSION_MAP: Partial<Record<`${Version}`, string>> = {
    v3: '3.0.0',
    'v3.1': '3.1.0',
    'v3.2': '3.2.0',
    // 'v3.3': '3.3.0',  ← add here
};
```

Update the default version in the constructor if the new version should become the default.

## 6. Add version-specific behavior (if needed)

Check if the new version requires different generator behavior. The V3 generator uses `isV31OrLater()` to branch between 3.0 and 3.1+ patterns:

- `applyNullable()` — 3.0 uses `nullable: true`, 3.1+ uses type arrays
- `shouldStripRefSiblings()` — 3.0 strips, 3.1+ allows
- `getSchemaForUnionType()` — 3.0 uses `nullable` keyword, 3.1+ uses `{ type: 'null' }` in `anyOf`

If the new version introduces further behavioral changes, add a new version check method (e.g., `isV33OrLater()`) and add conditional branches where needed.

## 7. Add schema validation

In `packages/swagger/test/helpers/schema-validator.ts`, add a validator function for the new version. Choose the correct ajv variant based on the JSON Schema draft:

- draft-04: `AjvDraft04`
- 2020-12: `Ajv2020`

## 8. Write tests

Add tests in `packages/swagger/test/unit/specification/schema-validation.spec.ts`:

- Empty spec produces a valid document for the new version
- CRUD controller produces a valid document
- Version string is correct in the output

## 9. Verify

```bash
npx nx run-many -t build
npm run lint
npx nx run-many -t test
```

## Version history

| Version | Added | JSON Schema Draft | Key Changes |
|---------|-------|-------------------|-------------|
| V2 (2.0) | original | draft-04 | — |
| V3 (3.0) | original | draft-04 (modified) | requestBody, nullable keyword |
| V3.1 | 2026-04-10 | 2020-12 | type arrays, $ref siblings allowed |
| V3.2 | 2026-04-10 | 2020-12 | incremental update over 3.1 |
