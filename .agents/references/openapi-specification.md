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

## TRAPI Mapping

| OpenAPI Concept | TRAPI Abstract Base | TRAPI V2 Override | TRAPI V3 Override |
|----------------|--------------------|--------------------|-------------------|
| `$ref` prefix | `getRefPrefix()` | `#/definitions/` | `#/components/schemas/` |
| `$ref` isolation | `buildProperties` early return | — | — |
| Nullable | `applyNullable()` | `x-nullable` | `nullable` |
| Deprecated props | `markPropertyDeprecated()` | `x-deprecated` | `deprecated` |
| Property defaults | `assignPropertyDefaults()` | no-op | sets `default` |
| Additional props | `resolveAdditionalProperties()` | `true` (boolean) | resolves type schema |
| File upload | — | `in: formData, type: file` | `requestBody` + `multipart/form-data` |
| Security | — | `securityDefinitions` | `components.securitySchemes` |
| Composition | — | flattened (no `allOf`) | `allOf` / `oneOf` |
| Enums (single-type) | `buildSchemaForRefEnum` | — | — |
| Enums (multi-type) | — | falls back to `string` | `anyOf` with per-type sub-schemas |

## Test Validation Strategy

Use the OAI JSON Schemas to validate generated specs against the official standard:
- V2 output → validate against `_archive_/schemas/v2.0/schema.json`
- V3 output → validate against `_archive_/schemas/v3.0/schema.json` (or `v3.1/schema.json` once 3.1 is properly targeted)

This allows us to catch spec violations that unit tests might miss (e.g., invalid property combinations, wrong types).

## Known Gaps

- TRAPI outputs `openapi: '3.1.0'` but uses 3.0.x patterns (no type arrays, no `$ref` siblings) — tracked in Plan #012 gap #3
- No `discriminator` support yet (planned in Plan #005)
- V2 `additionalProperties: true` loses type information (design choice, documented in `resolveAdditionalProperties`)
