# OpenAPI Specification Reference

## Schema Definitions

The official JSON Schema files for validating OpenAPI documents live in the OAI archive:

- **Repository**: https://github.com/OAI/OpenAPI-Specification
- **Schema directory**: `_archive_/schemas/`
- **Version snapshot**: Based on OAI/OpenAPI-Specification as of 2026-04-10

These schemas can be used to validate generated OpenAPI documents and to extend our test suites for V2 and V3 compliance.

### V2 (Swagger)

- Schema: `_archive_/schemas/v2.0/schema.json`
- Spec document: `_archive_/versions/2.0.md`

Key structural rules:
- `$ref` must be the only key in a JSON Reference Object (no sibling properties)
- `in: formData` parameters with file type use `type: "file"` (not `type: "string"`)
- No `nullable` keyword — use `x-nullable` extension
- Security definitions: `basic`, `apiKey`, `oauth2` (implicit, password, application, accessCode flows)
- `additionalProperties` is boolean only (no typed schema)
- No `requestBody` — file uploads via `in: formData` with `consumes: ["multipart/form-data"]`
- `deprecated` not available on properties — use `x-deprecated` extension

### V3.0

- Schema: `_archive_/schemas/v3.0/schema.json` and `schema.yaml`
- Spec document: `_archive_/versions/3.0.4.md`

Key structural rules:
- `$ref` must be the only key in a Reference Object (same as V2)
- `nullable: true` alongside `type` for nullable types
- `requestBody` replaces `in: body` parameters
- File uploads via `requestBody` with `multipart/form-data` content type
- Security schemes: `http` (with `scheme` field, not `schema`), `apiKey`, `oauth2`, `openIdConnect`
- `additionalProperties` can be boolean or Schema Object
- `allOf` / `oneOf` / `anyOf` for composition
- `discriminator` with `propertyName` for polymorphic types
- `deprecated: true` natively supported on properties, operations, parameters

### V3.1

- Schema: `_archive_/schemas/v3.1/schema.json` and `schema.yaml`
- Spec document: `_archive_/versions/3.1.1.md`

Key differences from 3.0:
- Full JSON Schema 2020-12 alignment
- `type` can be an array: `type: ["string", "null"]` replaces `nullable: true`
- `$ref` siblings allowed (description, summary can appear alongside `$ref`)
- `const` keyword supported
- `contentMediaType` / `contentEncoding` for binary content
- `webhooks` top-level field

### V3.2

- Spec document: `versions/3.2.0.md` (https://github.com/OAI/OpenAPI-Specification/blob/main/versions/3.2.0.md)

Key differences from 3.1:
- Incremental update building on 3.1 JSON Schema alignment
- TRAPI does not target 3.2 yet

## TRAPI Mapping

| OpenAPI Concept | TRAPI V2 Generator | TRAPI V3 Generator |
|----------------|--------------------|--------------------|
| `$ref` prefix | `#/definitions/` | `#/components/schemas/` |
| `$ref` isolation | `buildProperties` early return | `buildProperties` early return |
| Nullable types | `x-nullable: true` | `nullable: true` |
| Deprecated props | `x-deprecated: true` | `deprecated: true` |
| Additional props | `additionalProperties: true` | `additionalProperties: { type }` |
| File upload | `in: formData, type: file` | `requestBody` + `multipart/form-data` |
| Security | `securityDefinitions` | `components.securitySchemes` |
| Composition | flattened (no `allOf`) | `allOf` / `oneOf` |
| Enums (single-type) | `enum` array | `enum` array |
| Enums (multi-type) | falls back to `string` | `anyOf` with per-type sub-schemas |

## Test Validation

Vendored OAI JSON Schemas in `packages/swagger/test/schemas/`:
- `v2.0-schema.json` — validates V2 output against the official Swagger 2.0 schema
- `v3.0-schema.json` — validates V3 output against the official OpenAPI 3.0 schema

The `schema-validator.ts` helper uses `ajv-draft-04` (both schemas use JSON Schema draft-04).

## Known Gaps

- No `discriminator` support yet (planned in Plan #005)
- V2 `additionalProperties: true` loses type information (design choice)
