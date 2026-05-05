# @trapi/core 🌱

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fcore.svg)](https://badge.fury.io/js/@trapi%2Fcore)

Framework-neutral contract surface for TRAPI: the normalised IR (`Type`, `Controller`, `Method`, `Parameter`, …), the decorator/preset machinery (handlers, drafts, registry, `loadRegistry`, `validatePreset`), and the helpers preset authors use to author handlers (`controller(...)`, `method(...)`, `into`, `append`, `flag`, `readString`, …).

`@trapi/core` has **no `typescript` dependency**. Install it on its own to author a custom preset without pulling in the `@trapi/metadata` extraction pipeline (and its ~60 MB `typescript` peer).

Inspect the `CHANGELOG.md` in the repository for breaking changes.

## Public API

The stable public surface is documented in the [API Reference](https://trapi.tada5hi.net/guide/metadata-api-reference). Anything not listed there should be treated as internal even if it is re-exported, and may change without a major version bump.

**Table of Contents**

- [Installation](#installation)
- [What's inside](#whats-inside)
- [Authoring a preset](#authoring-a-preset)
- [Loading a preset](#loading-a-preset)
- [Errors](#errors)
- [Structure](#structure)
- [License](#license)

## Installation

```bash
npm install --save @trapi/core
```

You typically install `@trapi/core` for one of three reasons:

1. **Authoring a preset** — peer-depend on `@trapi/core`; consumers bring their own `@trapi/metadata`.
2. **Catching `CoreError`** in preset-loading code paths.
3. **Reading IR types** (e.g. `Type`, `Controller`) from a serialised `metadata.json` in a non-Node tool that doesn't want to pull `typescript`.

If you only consume metadata or generate OpenAPI specs, install `@trapi/metadata` and/or `@trapi/swagger` directly — they declare `@trapi/core` as a transitive dependency.

## What's inside

| Group | Symbols |
|---|---|
| **IR vocabulary** | `Type` union (`StringType`, `ObjectType`, `RefAliasType`, …), `Controller`, `Method`, `Parameter`, `Validator`, `Extension`, `Example`, `Response`, `Security`, all `is*Type` guards |
| **Constants** | `TypeName`, `ParameterSource`, `CollectionFormat`, `MethodName`, `ValidatorName`, `MarkerName`, `ParamKind`, `DecoratorTargetKind` |
| **Decorator/preset contract** | `Preset`, `Registry`, `ControllerHandler`, `MethodHandler`, `ParameterHandler`, JsDoc handler variants, `HandlerContext`, `JsDocHandlerContext`, `DecoratorSource`, `JsDocSource`, `ResolverMarker`, `UnmatchedDecoratorReport` |
| **Authoring helpers** | `controller(...)`, `method(...)`, `parameter(...)`, `controllerJsDoc(...)`, `methodJsDoc(...)`, `parameterJsDoc(...)`, `into`, `append`, `flag`, `readString`, `readNumber`, `readBoolean`, `readStringOrStringArray`, `setControllerPaths`, `setMethodPath` |
| **Loader / validator** | `loadRegistry`, `loadRegistryByName`, `resolvePresetByName`, `validatePreset`, `createRegistry`, `mergeRegistries`, `presetSchema` (and per-kind handler schemas) |
| **Marker lookups** | `namesForMarker`, `tagsForMarker`, `isHiddenMarker`, `isExtensionMarker`, `isDeprecatedMarker`, `numericMarkerKind` |
| **Errors** | `CoreError`, `CoreErrorCode`, `isCoreError` |
| **Test helpers** | `literalArg`, `identifierArg`, `arrayArg`, `objectArg`, `typeArg`, `unresolvableArg`, `createHandlerContext` |

## Authoring a preset

```typescript
import {
    type Preset,
    controller,
    method,
    parameter,
    append,
    flag,
    into,
    readString,
} from '@trapi/core';

const preset: Preset = {
    name: 'my-framework',
    controllers: [
        controller({
            match: { name: 'Controller', on: 'class' },
            apply: setControllerPaths,
        }),
    ],
    methods: [
        method({
            match: { name: 'Get', on: 'method' },
            apply: (ctx, draft) => {
                draft.verb = 'get';
                setMethodPath(ctx, draft);
            },
        }),
    ],
    parameters: [
        parameter({
            match: { name: 'Body', on: 'parameter' },
            apply: into('source').literal('body'),
        }),
        parameter({
            match: { name: 'Query', on: 'parameter' },
            apply: into('source').literal('query'),
        }),
    ],
    methodJsDoc: [
        methodJsDoc({
            match: { tag: 'hidden' },
            marker: 'hidden',
            apply: flag('hidden'),
        }),
    ],
};

export default preset;
```

A preset bundles handlers per kind (`controllers`, `methods`, `parameters`, `controllerJsDoc`, `methodJsDoc`, `parameterJsDoc`), and may declare `extends: string[]` to inherit handlers from another preset. The `replaces` field on a handler shadows matching parent handlers (`true` shadows all matches by name; `'<presetName>'` shadows that preset's contributions only).

See [Authoring custom presets](https://trapi.tada5hi.net/guide/advanced-custom-presets) in the docs for the full handler API, marker semantics, and `replaces` rules.

## Loading a preset

`@trapi/metadata` calls into `loadRegistry` automatically when given `MetadataGenerateOptions.preset`. If you want to drive it yourself:

```typescript
import { loadRegistry, resolvePresetByName } from '@trapi/core';

const preset = await resolvePresetByName('@trapi/preset-decorators-express');
const registry = await loadRegistry(preset, { resolver: resolvePresetByName });
```

`resolvePresetByName` accepts an npm package name, a relative path, or a `module:` specifier. `loadRegistry` walks the `extends` chain via the supplied `resolver` and returns a flat per-kind handler list ready for the orchestrator.

## Errors

The loader and validator throw `CoreError` with one of:

| Code | When |
|---|---|
| `CORE_PRESET_NOT_FOUND` | Every lookup path for the preset failed with `ERR_MODULE_NOT_FOUND` / `ENOENT`. |
| `CORE_PRESET_INVALID` | The preset module loaded but evaluation failed (syntax error, throw at import time), or the preset object failed schema validation. |
| `CORE_PRESET_CYCLE` | The `extends` graph contains a cycle. |
| `CORE_PRESET_REPLACES_NO_MATCH` | A handler's `replaces` did not match any parent handler (only thrown in `strict: true` mode). |

`CoreError` extends `BaseError` from [`@ebec/core`](https://github.com/Tada5hi/ebec). It does **not** extend `MetadataError` — those are sibling roots. If you want to catch both with one handler, catch `BaseError`.

## Structure

```
src/
├── controller/    # Controller + IControllerGenerator port
├── method/        # Method, MethodType, MethodName
├── parameter/     # Parameter, IParameterGenerator, ParameterSource, CollectionFormat
├── generator/     # Example, Response, Security
├── validator/     # Validator, ValidatorMeta, Validators, ValidatorName
├── resolver/      # Type union, BaseType, TypeName, Extension, type guards
├── decorator/     # Preset machinery (handlers, drafts, helpers, loader, validator)
├── error/         # CoreError, CoreErrorCode
├── variable.ts    # VariableType
└── index.ts       # Public entry point
```

## License

Made with 💚

Published under [MIT License](./LICENSE).
