# Migrating from 2.x to 3.0

TRAPI 3.0 extracts the framework-neutral contract surface (IR types, decorator/preset machinery, authoring helpers) out of `@trapi/metadata` into a new package: **`@trapi/core`**. The TypeScript compiler integration stays in `@trapi/metadata`. The split lets preset authors install only `@trapi/core` and skip the ~60 MB `typescript` peer dependency that comes with `@trapi/metadata`.

If you only call `generateMetadata` / `generateSwagger` and use a bundled preset, the migration is a single import-path change. If you author a **custom preset**, you re-target imports and update your `peerDependencies`.

## At a glance

| Area | 2.x | 3.0 |
| --- | --- | --- |
| Where IR + handler types live | `@trapi/metadata` (re-exported) | `@trapi/core` (no re-export from metadata) |
| Where authoring helpers live (`controller`, `into`, `append`, `flag`, `readString`, …) | `@trapi/metadata` | `@trapi/core` |
| Where the preset loader lives (`loadRegistry`, `resolvePresetByName`, `validatePreset`) | `@trapi/metadata` | `@trapi/core` |
| Where `Metadata` + `isMetadata` live | `@trapi/metadata` | `@trapi/core` |
| Preset error type | `MetadataError` (subclass `ConfigError` with code `PRESET_NOT_FOUND`) | `CoreError` with `CoreErrorCode.PRESET_NOT_FOUND` / `PRESET_INVALID` / `PRESET_CYCLE` / `PRESET_REPLACES_NO_MATCH` |
| Preset package `peerDependencies` | `@trapi/metadata` | `@trapi/core` |
| `@trapi/metadata` re-exports the contract surface | yes | **no** — clean break, install `@trapi/core` directly |
| `ConfigErrorCode.PRESET_NOT_FOUND` | yes | removed (replaced by `CoreErrorCode.PRESET_NOT_FOUND`) |
| `generateSwagger({ metadata: MetadataGenerateOptions \| Metadata })` | accepted both | **only `Metadata`** — call `generateMetadata` yourself first |
| `@trapi/swagger` runtime dep on `@trapi/metadata` | yes (and transitively on `typescript`) | **removed** — `@trapi/swagger` no longer depends on either |

The `@trapi/metadata` public surface for `generateMetadata`, `MetadataGenerateOptions`, `CacheClient`, the TS-coupled errors (`ConfigError`, `GeneratorError`, `ParameterError`, `ResolverError`, `ValidatorError`), and the orchestrator (`applyDecoratorHandlers`, `applyJsDocHandlers`, `buildHandlerContext`) is **unchanged**.

## What you may need to change

### 1. Imports for IR types and authoring helpers

If you imported any of the following from `@trapi/metadata`, switch the import source to `@trapi/core`:

- IR types: `Type`, `Controller`, `Method`, `Parameter`, `Validator`, `Extension`, `Example`, `Response`, `Security`, `BaseType`, `RefObjectType`, `RefAliasType`, `NeverType`, `VoidType`, `PrimitiveType`, … and the `is*Type` guards.
- The metadata wrapper: `Metadata`, `isMetadata`.
- Constants: `TypeName`, `ParameterSource`, `CollectionFormat`, `MethodName`, `MarkerName`, `ParamKind`, `DecoratorTargetKind`, `NumericKind`.
- Handler/preset types: `Preset`, `Registry`, `ControllerHandler`, `MethodHandler`, `ParameterHandler` (and JsDoc variants), `HandlerContext`, `JsDocHandlerContext`, `DecoratorSource`, `JsDocSource`, `ResolverMarker`, `UnmatchedDecoratorReport`.
- Authoring helpers: `controller(...)`, `method(...)`, `parameter(...)`, `controllerJsDoc(...)`, `methodJsDoc(...)`, `parameterJsDoc(...)`, `into`, `append`, `flag`, `readString`, `readNumber`, `readBoolean`, `readStringOrStringArray`, `setControllerPaths`, `setMethodPath`.
- Loader / validator: `loadRegistry`, `loadRegistryByName`, `resolvePresetByName`, `validatePreset`, `createRegistry`, `mergeRegistries`, `presetSchema` (and per-kind handler schemas).
- Marker lookups: `namesForMarker`, `tagsForMarker`, `isHiddenMarker`, `isExtensionMarker`, `isDeprecatedMarker`, `numericMarkerKind`.

```typescript
// 2.x
import {
    type Preset,
    controller,
    method,
    into,
    append,
    flag,
} from '@trapi/metadata';

// 3.0
import {
    type Preset,
    controller,
    method,
    into,
    append,
    flag,
} from '@trapi/core';
```

`@trapi/metadata` no longer re-exports any of these. There is no compat shim — the TypeScript compiler will surface every wrong import path as an error during the upgrade, which makes the migration mechanical.

### 2. Custom preset packages: update `peerDependencies`

Preset packages should now peer-depend on `@trapi/core` only — not on `@trapi/metadata`.

```diff
 {
   "name": "@my-org/trapi-preset",
   "peerDependencies": {
-    "@trapi/metadata": "^2.0.0"
+    "@trapi/core": "^1.0.0-beta.1"
   },
   "devDependencies": {
-    "@trapi/metadata": "^2.0.0",
+    "@trapi/core": "^1.0.0-beta.1",
     "...": "..."
   }
 }
```

You can drop `@trapi/metadata` from your direct dependencies entirely if you don't call `generateMetadata` or import its types — most preset packages don't.

### 3. Catching preset-load failures

`MetadataError` no longer catches preset-load failures, because preset loading lives in `@trapi/core` and throws `CoreError`. The two are siblings, both extending `BaseError` from `@ebec/core`:

```typescript
// 2.x — caught preset-load failures because they were ConfigError / MetadataError
try {
    await generateMetadata({ entryPoint, preset: '@my-org/preset' });
} catch (e) {
    if (e instanceof MetadataError) { /* including ConfigError(PRESET_NOT_FOUND) */ }
}

// 3.0 — preset failures are CoreError now
import { CoreError, CoreErrorCode } from '@trapi/core';
import { MetadataError } from '@trapi/metadata';

try {
    await generateMetadata({ entryPoint, preset: '@my-org/preset' });
} catch (e) {
    if (e instanceof CoreError && e.code === CoreErrorCode.PRESET_NOT_FOUND) {
        // preset module didn't resolve
    } else if (e instanceof CoreError && e.code === CoreErrorCode.PRESET_INVALID) {
        // preset evaluated but failed schema validation, or threw on import
    } else if (e instanceof MetadataError) {
        // TS extraction error (ResolverError, GeneratorError, ParameterError, …)
    }
}
```

If you want to catch both with one handler, catch `BaseError` from `@ebec/core`:

```typescript
import { BaseError } from '@ebec/core';

try { /* ... */ }
catch (e) {
    if (e instanceof BaseError) { /* both MetadataError and CoreError land here */ }
}
```

### 4. `ConfigErrorCode.PRESET_NOT_FOUND` removed

`ConfigError` keeps its other codes (`TSCONFIG_MALFORMED`, `PRESET_MISSING`), but `PRESET_NOT_FOUND` moved out — its only thrower (the preset loader) lives in `@trapi/core` now.

```typescript
// 2.x
if (e instanceof ConfigError && e.code === ConfigErrorCode.PRESET_NOT_FOUND) { /* ... */ }

// 3.0
if (e instanceof CoreError && e.code === CoreErrorCode.PRESET_NOT_FOUND) { /* ... */ }
```

`PRESET_INVALID` is new in 3.0 — surfaces module-evaluation errors (syntax errors, throws at import time, schema validation failures) that 2.x silently misreported as `PRESET_NOT_FOUND`.

### 5. `generateSwagger` no longer accepts `MetadataGenerateOptions`

`@trapi/swagger` 3.0 only consumes a pre-built `Metadata` value. It has been fully decoupled from `@trapi/metadata` — no runtime dependency, no transitive `typescript` install. Call `generateMetadata` yourself and pass the result in:

```typescript
// 2.x — generateSwagger ran extraction internally when given options
const spec = await generateSwagger({
    version: 'v3',
    metadata: {
        entryPoint: 'src/controllers/**/*.ts',
        preset: '@trapi/preset-decorators-express',
    },
});

// 3.0 — extract first, emit second
import { generateMetadata } from '@trapi/metadata';
import { generateSwagger } from '@trapi/swagger';

const metadata = await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
});

const spec = await generateSwagger({ version: 'v3', metadata });
```

If you re-emit the same metadata in multiple shapes (V2 + V3, JSON + YAML), this also avoids the redundant TypeScript walk that the 2.x convenience signature did each time.

`SwaggerGenerateOptions.metadata` now has type `Metadata` (from `@trapi/core`) rather than `Metadata | MetadataGenerateOptions`. The `Metadata` type itself moved to `@trapi/core` (see section 1) — re-target imports accordingly.

The CLI flow is unchanged from a user perspective; `@trapi/cli` does the composition internally.

### 6. New: `@trapi/core/test-helpers` for preset unit tests

Preset authors who unit-test handlers in isolation (without invoking `generateMetadata`) can import synthetic decorator inputs and a context factory from `@trapi/core`:

```typescript
import {
    createHandlerContext,
    literalArg,
    arrayArg,
    typeArg,
} from '@trapi/core';

const ctx = createHandlerContext({
    target: 'method',
    host: { name: 'list', parentName: 'UserController' },
    arguments: [literalArg('/users'), arrayArg([literalArg('admin')])],
});

const draft = { /* ... */ };
myMethodHandler.apply(ctx, draft);

expect(draft.path).toEqual('/users');
```

These were previously available from `@trapi/metadata` under the same names; the move to `@trapi/core` means you no longer pull `typescript` into your test environment to use them.

## Migration checklist

- [ ] `npm install @trapi/core` if you author a custom preset, catch preset-load errors, or read IR types directly.
- [ ] Update every import of an IR type, handler/preset type, authoring helper, loader, validator, `Metadata`, or `isMetadata` to come from `@trapi/core` instead of `@trapi/metadata`.
- [ ] If you call `generateSwagger`, switch from the union `metadata: options | Metadata` to extracting metadata first via `generateMetadata` and passing the result. The CLI flow is unchanged.
- [ ] If you publish a preset package, swap `@trapi/metadata` for `@trapi/core` in `peerDependencies` (and `devDependencies` if applicable).
- [ ] Replace `MetadataError` checks for preset-load failures with `CoreError` + `CoreErrorCode` checks.
- [ ] Replace `ConfigErrorCode.PRESET_NOT_FOUND` with `CoreErrorCode.PRESET_NOT_FOUND`.
- [ ] Run `generateMetadata` against your project — output should be byte-identical to 2.x for the same source. If not, the change is unrelated to this migration.

## See also

- [Custom Presets](/guide/advanced-custom-presets) — preset authoring API (now via `@trapi/core`)
- [`@trapi/core` README](https://www.npmjs.com/package/@trapi/core) — full export list and authoring quickstart
- [Migrating from 1.x to 2.0](/guide/migration-2.0) — the previous migration guide
