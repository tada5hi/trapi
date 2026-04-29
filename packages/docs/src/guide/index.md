# What is TRAPI?

**T**ypeScript **R**est **API** is a suite of packages that extracts REST API metadata from TypeScript decorators and turns it into OpenAPI 2.0, 3.0, 3.1, or 3.2 specifications — without locking you into a specific decorator library.

Most tools in this space ship their own decorator set that you have to adopt. TRAPI takes the opposite approach: you describe how your existing decorators (custom or third-party) map to a shared semantic model, and TRAPI takes it from there.

## At a Glance

- **Decorator-agnostic** — use any decorator library, bring your own mapping or a preset
- **Pure AST analysis** — decorators stay as no-op markers; all work happens at build time
- **Zero runtime overhead** — the generated spec is static, nothing ships to production
- **Composable** — metadata can feed OpenAPI, code generators, validators, or SDK tooling
- **Spec-compliant** — tested against the official OpenAPI JSON Schemas

## Pipeline

```text
TypeScript source  →  @trapi/metadata  →  Metadata  →  @trapi/swagger  →  OpenAPI spec
   (decorators)        (AST analysis)     (normalised)    (emitters)       (JSON/YAML)
```

The metadata model is a first-class output. Other consumers — route generators, runtime validators, typed API clients — can be built on top of it without knowing anything about OpenAPI.

## Packages

| Package | Purpose |
| --- | --- |
| [`@trapi/metadata`](/guide/metadata-installation) | Extracts metadata from decorated TypeScript source |
| [`@trapi/swagger`](/guide/swagger-installation) | Emits OpenAPI 2.0, 3.0, 3.1 & 3.2 specs from metadata |
| `@trapi/preset-decorators-express` | Self-contained preset for [@decorators/express](https://github.com/serhiisol/node-decorators) (routing + TRAPI markers + JSDoc handlers) |
| `@trapi/preset-typescript-rest` | Self-contained preset for [typescript-rest](https://github.com/thiagobustamante/typescript-rest) (routing + TRAPI markers + JSDoc handlers) |

## Where to Next

- New to TRAPI? Start with the [Quick Start](/guide/quick-start).
- Curious about the design trade-offs? Read the [Philosophy](/guide/philosophy).
- Need a mental model of how pieces fit together? See [Key Concepts](/guide/concepts).
- Already using a framework? Jump to [Framework Integration](/guide/framework-integration).
