# OpenAPI Specification Reference

## Schema Definitions

The official JSON Schema files for validating OpenAPI documents live in the OAI archive:

- **Repository**: https://github.com/OAI/OpenAPI-Specification
- **Schema directory**: `_archive_/schemas/`

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

### V3.0

- Schema: `_archive_/schemas/v3.0/schema.json` and `schema.yaml`
- Spec document: `_archive_/versions/3.0.4.md`

Key structural rules:
- `$ref` must be the only key in a Reference Object (same as V2)
- `nullable: true` alongside `type` for nullable types
- `requestBody` replaces `in: body` parameters
- File uploads via `requestBody` with `multipart/form-data` content type
- Security schemes: `http`, `apiKey`, `oauth2`, `openIdConnect`
- `additionalProperties` can be boolean or Schema Object
- `allOf` / `oneOf` / `anyOf` for composition
- `discriminator` with `propertyName` for polymorphic types

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

## TRAPI Mapping

| OpenAPI Concept | TRAPI V2 Generator | TRAPI V3 Generator |
|----------------|--------------------|--------------------|
| `$ref` isolation | `buildProperties` early return | `buildProperties` early return |
| Nullable types | `x-nullable: true` | `nullable: true` |
| File upload | `in: formData, type: file` | `requestBody` + `multipart/form-data` |
| Security | `securityDefinitions` | `components.securitySchemes` |
| Composition | N/A (flattened) | `allOf` / `oneOf` |
| Additional props | `additionalProperties: true` | `additionalProperties: { type }` |
| Enums | `enum` array | `enum` array (mixed → `anyOf`) |

## Known Gaps

- TRAPI outputs `openapi: '3.1.0'` but uses 3.0.x patterns (no type arrays, no `$ref` siblings)
- No `discriminator` support yet (planned in Plan #005)
- V2 `additionalProperties: true` loses type information (design choice)
