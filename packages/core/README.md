<p align="center"><img src="./assets/logo.svg" width="120" height="120" alt="TRAPI logo: the letter T inside a pair of generic type brackets"></p>
<h1 align="center">@trapi/core</h1>
<p align="center"><strong>Framework-neutral metadata types and preset machinery for TRAPI, without the TypeScript compiler.</strong></p>
<p align="center">Describe what your decorators mean as a <code>Preset</code> of small handlers, and read extracted metadata with typed guards.<br>A preset package depends on this contract alone, so <code>typescript</code> never enters its install graph.</p>
<p align="center">
  <a href="https://github.com/tada5hi/trapi/actions/workflows/main.yml"><img src="https://github.com/tada5hi/trapi/actions/workflows/main.yml/badge.svg" alt="CI status"></a>
  <a href="https://www.npmjs.com/package/@trapi/core"><img src="https://img.shields.io/npm/v/%40trapi%2Fcore" alt="npm version of @trapi/core"></a>
  <a href="https://github.com/tada5hi/trapi/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT license"></a>
</p>
<p align="center"><a href="#why-trapicore">Why</a> · <a href="#installation">Installation</a> · <a href="#authoring-a-preset">Authoring a preset</a> · <a href="#loading-a-preset">Loading a preset</a> · <a href="#errors">Errors</a> · <a href="#api">API</a></p>

---

## Why @trapi/core?

TRAPI reads your controllers through your framework's own decorators. Something has to say that `@Get('/:id')` is an HTTP `GET` on `/:id` and that `@Path('id')` binds a path parameter. In `@trapi/core` that something is a **preset**: a list of handlers, each matching one decorator name and writing what it means onto a draft.

| Concern | Without @trapi/core | With @trapi/core |
| --- | --- | --- |
| **Your decorator vocabulary** | Rename your decorators to the ones a generator knows, or fork the generator | A `Preset` maps any decorator or JSDoc tag name to a handler that mutates a `ControllerDraft`, `MethodDraft` or `ParameterDraft` |
| **Install weight of a preset** | Depending on the extractor pulls in its `typescript` peer | Peer-depend on `@trapi/core` only; its dependencies are `@ebec/core`, `@validup/zod`, `locter`, `smob`, `validup` and `zod` |
| **Changing one decorator of an existing preset** | Copy the whole preset and edit it | `extends: ['@trapi/preset-decorators-express']` plus one handler with `replaces: true` |
| **A broken preset** | Noticed when the generated document looks wrong | `loadRegistry` validates every preset in the `extends` chain and throws a `CoreError` naming the field, e.g. `Property methods[0].match.on is invalid` |
| **Testing a handler** | Compile a fixture project for every case | `createHandlerContext({ args: [literalArg('/users')] })` and a draft from `newMethodDraft(...)` |
| **Reading `metadata.json` in other tools** | Hand-written types that drift from the extractor | The `Metadata` type, the `Type` union with one guard per `typeName`, and `isMetadata` |

<p align="center"><img src="./assets/handler-draft.svg" width="960" alt="A controller class carries @Controller('/users'), a method with @Get('/:id') and @Audit(), and a parameter with @Path('id'). The preset's controller handler matches Controller and sets paths ['/users'] on the ControllerDraft, the method handler matches Get and sets verb 'get' and path '/:id' on the MethodDraft, and the parameter handler matches Path and sets in 'path' and name 'id' on the ParameterDraft. @Audit has no handler and is skipped; @trapi/metadata reports it with strict: true and fails with strict: 'throw'."></p>

Every handler whose `match` fits a decorator runs, in registry order, and decorator handlers run before JSDoc handlers on the same node, so JSDoc acts as the override layer. The orchestrator that walks your source and turns finished drafts into `Controller`, `Method` and `Parameter` lives in [`@trapi/metadata`](https://www.npmjs.com/package/@trapi/metadata); everything a handler touches lives here.

**Table of Contents**

- [Installation](#installation)
- [Authoring a preset](#authoring-a-preset)
  - [Handlers, contexts and drafts](#handlers-contexts-and-drafts)
  - [Writers and readers](#writers-and-readers)
  - [Extending and replacing](#extending-and-replacing)
  - [Resolver markers](#resolver-markers)
  - [Finalizers](#finalizers)
  - [Testing handlers](#testing-handlers)
- [Loading a preset](#loading-a-preset)
- [Reading metadata](#reading-metadata)
- [Errors](#errors)
- [API](#api)
- [Notes](#notes)
- [Structure](#structure)
- [License](#license)

## Installation

```bash
npm install --save @trapi/core
```

The package is ESM only (`import`, no `require`) and ships its own type declarations. Inspect the `CHANGELOG.md` in the repository for breaking changes.

You typically install `@trapi/core` for one of three reasons:

1. **Authoring a preset.** List `@trapi/core` under `peerDependencies`; the consuming project already has it through `@trapi/metadata`, and your handlers then use that copy.
2. **Catching `CoreError`** in code that loads presets.
3. **Reading metadata types** (`Metadata`, `Type`, `Controller`, …) from a serialised `metadata.json` in tooling that should not pull in `typescript`.

If you only extract metadata or generate OpenAPI documents, install `@trapi/metadata` and/or `@trapi/swagger`; both depend on `@trapi/core` already. `@trapi/metadata` does **not** re-export `@trapi/core`, so import contract types from `@trapi/core` directly.

<p align="center"><img src="./assets/installs.svg" width="960" alt="A preset package lists @trapi/core as a peer dependency. @trapi/swagger depends on @trapi/core. @trapi/metadata depends on @trapi/core and has typescript 5.0.0 or later as a peer dependency. @trapi/core itself depends on @ebec/core, @validup/zod, locter, smob, validup and zod, and not on typescript, so a preset or a swagger-only install never pulls the compiler. @trapi/metadata does not re-export @trapi/core, so contract types are imported from @trapi/core directly."></p>

## Authoring a preset

```typescript
import type { Preset } from '@trapi/core';
import {
    MarkerName,
    ParamKind,
    append,
    controller,
    flag,
    method,
    methodJsDoc,
    parameter,
    readString,
    setControllerPaths,
    setMethodPath,
} from '@trapi/core';

const preset: Preset = {
    name: '@my-org/trapi-preset',
    controllers: [
        controller({
            match: { name: 'Controller', on: 'class' },
            apply: (ctx, draft) => setControllerPaths(draft, ctx.argument(0)),
        }),
        controller({
            match: { name: 'Tags', on: 'class' },
            apply: append('tags').positionalAll(),
        }),
    ],
    methods: [
        method({
            match: { name: 'Get', on: 'method' },
            apply: (ctx, draft) => {
                draft.verb = 'get';
                setMethodPath(draft, ctx.argument(0));
            },
        }),
        method({
            match: { name: 'Hidden', on: 'method' },
            marker: MarkerName.Hidden,
            apply: flag('hidden'),
        }),
    ],
    parameters: [
        parameter({
            match: { name: 'Body', on: 'parameter' },
            apply: (_ctx, draft) => {
                draft.in = ParamKind.Body;
            },
        }),
        parameter({
            match: { name: 'Query', on: 'parameter' },
            apply: (ctx, draft) => {
                const name = readString(ctx.argument(0));

                // a named key is one query parameter, no name means the whole query object
                draft.in = name ? ParamKind.QueryProp : ParamKind.Query;
                if (name) {
                    draft.name = name;
                }
            },
        }),
    ],
    methodJsDoc: [
        methodJsDoc({
            match: { tag: 'summary' },
            apply: (ctx, draft) => {
                if (ctx.source.text) {
                    draft.summary = ctx.source.text;
                }
            },
        }),
    ],
};

export default preset;
```

- A `Preset` has a `name`, an optional `extends: string[]`, handler arrays per kind (`controllers`, `methods`, `parameters`, `controllerJsDoc`, `methodJsDoc`, `parameterJsDoc`) and optional `finalizeMethod` / `finalizeController` hooks. Every array is optional.
- `controller(...)`, `method(...)`, `parameter(...)`, `controllerJsDoc(...)`, `methodJsDoc(...)` and `parameterJsDoc(...)` return their argument unchanged. They exist so TypeScript checks `match` and the `apply` signature at the declaration.
- Export the preset as the default export or as a named export `preset`. The loader tries `preset`, then `default`, then the module itself.
- Publish it as an ESM package with `@trapi/core` in `peerDependencies`, not in `dependencies`, and without `@trapi/metadata`.

The [Custom Presets guide](https://trapi.tada5hi.net/guide/advanced-custom-presets) walks through package setup, contributed parameters and a publishing checklist; [`examples/decorators`](https://github.com/tada5hi/trapi/tree/master/examples/decorators) is a complete preset with its own decorator runtime and tests.

### Handlers, contexts and drafts

A decorator handler is `{ match, apply, replaces?, marker? }`; a JSDoc handler has the same shape with `match: { tag, on? }`.

| `match` field | Rule |
| --- | --- |
| `name` / `tag` | Compared exactly with the decorator name or JSDoc tag name. |
| `on` | Optional. When set it must equal the array the handler lives in: `'class'` in `controllers` / `controllerJsDoc`, `'method'` in `methods` / `methodJsDoc`, `'parameter'` in `parameters` / `parameterJsDoc`. Any other value fails validation. |

`apply(ctx, draft)` receives a context and mutates the draft in place. A throwing handler fails generation.

| Context | Members |
| --- | --- |
| `HandlerContext` (decorators) | `host` (`{ name, parentName? }`), `decorator` (`{ name, location? }`), `argument(i)`, `arguments()`, `typeArgument(i)`, `typeArguments()`, `parameterType()` |
| `JsDocHandlerContext` | `host`, `source` (`{ tag, text?, typeExpression?, parameterName?, target, host }`), `parameterType()` |

Each `DecoratorArgument` is `{ kind, raw }` where `kind` is `'literal'`, `'identifier'` (a constant resolved to its value), `'array'`, `'object'` or `'unresolvable'` (a call or anything else that cannot be evaluated statically). A type argument is `{ resolve(): Type }`.

The drafts start from `newControllerDraft`, `newMethodDraft` and `newParameterDraft`; these are the fields handlers usually write:

| Draft | Fields |
| --- | --- |
| `ControllerDraft` | `paths` (setting it claims the class as a controller), `hidden`, `deprecated`, `tags`, `consumes`, `produces`, `responses`, `security`, `extensions`, `successProduces` |
| `MethodDraft` | `verb` (`'get'`, `'post'`, …; without it the method is not a route), `path`, `operationId`, `summary`, `description`, `hidden`, `deprecated`, `tags`, `consumes`, `produces`, `responses`, `security`, `extensions`, `parameters`, `defaultResponseExamples`, `successStatus`, `successProduces`, `type` |
| `ParameterDraft` | `in` (a `ParamKind`), `name`, `description`, `required`, `type`, `collectionFormat`, `allowEmptyValue`, `default`, `minItems`, `maxItems`, `deprecated`, `examples`, `exampleLabels`, `extensions`, `validators` |

`ParamKind` lists the parameter locations: `body`, `bodyProp`, `query`, `queryProp`, `path`, `header`, `cookie`, `formData` and `context`. `query` means the whole query object, which the parameter generator splits into `queryProp` entries; `context` marks a framework object (request, response, `next`) that produces no OpenAPI parameter. `successStatus`, `successProduces` and contributed `parameters` have special handling, described in the [Handler Reference](https://trapi.tada5hi.net/guide/advanced-handler-reference#draft-fields-with-special-handling).

### Writers and readers

Three writers build an `apply` function for the common cases:

<p align="center"><img src="./assets/writers.svg" width="960" alt="into('path').positional(0) on @Path('/users') writes path '/users'. append('tags').positionalAll() on @Tags('users', ['admin']) flattens the array argument and writes tags ['users', 'admin']. flag('hidden') on @Hidden() writes hidden true. into('path').positional(0) on @Path({ url: '/x' }) ignores the object argument and leaves path as the empty string the draft starts with."></p>

| Writer | Writes |
| --- | --- |
| `into(key).positional(i)` | Argument `i` to `draft[key]` when it is a literal or identifier; object, array and unresolvable arguments are ignored. |
| `into(key).typeArgument(i = 0)` | The resolved type argument `i` to `draft[key]`. |
| `append(key).positional(i)` | Argument `i` pushed onto `draft[key]`, array arguments flattened. |
| `append(key).positionalAll()` | Every argument, array arguments flattened. Throws a `TypeError` if `draft[key]` exists and is not an array. |
| `flag(key, value = true)` | `value` to `draft[key]`, whatever the arguments. |

The writers take a `HandlerContext`, so use them in decorator handlers; JSDoc handlers read `ctx.source` themselves.

Readers turn one argument into a value and return `undefined` when it does not fit:

| Reader | Returns |
| --- | --- |
| `readString(arg)` | A string literal or an identifier that resolves to a string. |
| `readNumber(arg)` | A number literal or an identifier that resolves to a number (`HttpStatus.CREATED`, a `const`, an enum member). |
| `readBoolean(arg)` | A boolean literal. |
| `readStringOrStringArray(arg)` | `[value]` for a string, the array for an all-string array; `undefined` if any element is not a string. |
| `setControllerPaths(draft, arg)` | Writes `draft.paths` from a string or string array, `['']` when the argument is missing or unresolvable. |
| `setMethodPath(draft, arg)` | Writes `draft.path` when the argument is a string, otherwise leaves it as it is. |

The strict readers `requireString(ctx, i)`, `requireNumber(ctx, i)` and `requireArgument(ctx, i, read, expected)` return `undefined` only when the argument is absent. When it is present but cannot be read they throw a `CoreError` with code `CORE_DECORATOR_ARGUMENT_INVALID` that names the decorator, the host and, when known, the file and line, so a status code behind an unresolvable constant fails generation instead of being documented under the wrong value.

```typescript
import { method, requireNumber } from '@trapi/core';

// @Status(201)
export const statusHandler = method({
    match: { name: 'Status', on: 'method' },
    apply: (ctx, draft) => {
        const status = requireNumber(ctx, 0);

        if (status !== undefined) {
            draft.successStatus = String(status);
        }
    },
});
```

### Extending and replacing

`extends` inherits the handlers of other presets, resolved by name. Inherited handlers and your own run side by side; `replaces` on one of your handlers removes inherited ones instead.

<p align="center"><img src="./assets/replaces.svg" width="960" alt="Preset app extends base and extra; each parent has a Get and a Post method handler. app declares Get with replaces: true, Post with replaces: 'extra', and a second Post without replaces. loadRegistry collects parents first in extends order, then app's own handlers. Get with replaces: true removes the Get handlers of base and extra. Post with replaces: 'extra' removes only extra's Post, so base's Post stays. The second Post of app is a sibling and stays as well. The resulting registry.methods is base Post, app Get, app Post, app Post."></p>

```typescript
import type { Preset } from '@trapi/core';
import { controller, setControllerPaths } from '@trapi/core';

export const preset: Preset = {
    name: '@my-org/trapi-preset',
    extends: ['@trapi/preset-decorators-express'],
    controllers: [
        controller({
            match: { name: 'Controller', on: 'class' },
            replaces: true,
            apply: (ctx, draft) => {
                setControllerPaths(draft, ctx.argument(0));
                draft.tags.push('v2');
            },
        }),
    ],
};
```

- **`replaces: true`** removes every inherited handler with the same `match.name` (or `match.tag`), whichever parent contributed it.
- **`replaces: '<presetName>'`** removes only the matching handlers that the preset with that `name` contributed.
- When the replacing handler sets `match.on`, only inherited handlers with the same `on` are removed.
- **Siblings are additive.** `replaces` never removes handlers of the same preset; two handlers for `Get` in one preset both run, in source order.
- **Order.** Parents come first, in `extends` order and depth first, then the preset's own handlers.
- **Strict.** `loadRegistry(preset, { resolver, strict: true })` throws `CORE_PRESET_REPLACES_NO_MATCH` when a `replaces` handler removes nothing, which catches a parent preset that renamed or dropped a decorator. Without `strict` the handler is simply added.

### Resolver markers

The type resolver in `@trapi/metadata` needs some decorators outside of the handler flow: a number-typed property marked as an integer, a deprecated interface, `x-*` extensions on a property. It finds them by concept, not by name. A handler's `marker` names that concept, so a preset can rename the decorator freely.

<p align="center"><img src="./assets/markers.svg" width="960" alt="A preset renames three concepts. A parameters handler matching AsInteger carries marker numeric int, so namesForMarker returns AsInteger and the resolver turns a property @AsInteger() age: number into typeName integer. A controllerJsDoc handler matching the tag gone carries marker deprecated, so tagsForMarker returns gone and an interface documented with @gone becomes a refObject with deprecated true. A parameters handler matching Meta carries marker extension, so namesForMarker returns Meta and @Meta('x-internal', true) on a property becomes the extension with key x-internal and value true. The resolver reads deprecated, extension and numeric markers; a hidden marker is not read, hiding comes from the handler's apply."></p>

```typescript
import { MarkerName, NumericKind, controllerJsDoc, parameter } from '@trapi/core';

export const asInteger = parameter({
    match: { name: 'AsInteger' },
    marker: { numeric: NumericKind.Int },
    apply: () => {},
});

export const gone = controllerJsDoc({
    match: { tag: 'gone' },
    marker: MarkerName.Deprecated,
    apply: (_ctx, draft) => {
        draft.deprecated = true;
    },
});
```

| Marker | Read by the resolver |
| --- | --- |
| `{ numeric: 'int' \| 'long' \| 'float' \| 'double' }` | A `number` under a decorator or JSDoc tag with this marker resolves to `integer`, `long`, `float` or `double` instead of `double`. |
| `'deprecated'` | A class or interface carrying a decorator or JSDoc tag with this marker becomes a reference type with `deprecated: true`. |
| `'extension'` | Decorators with this marker on a property contribute `{ key: arg0, value: arg1 }`; `arg0` must be a string literal. |
| `'hidden'` | Accepted and listed by `namesForMarker`, but the resolver does not read it. Hiding comes from the handler's `apply` (`flag('hidden')`). |

`namesForMarker(registry, predicate)` collects the decorator names of handlers in `controllers`, `methods` and `parameters`; `tagsForMarker(registry, predicate)` collects the JSDoc tags of the three JSDoc kinds. The predicates `isHiddenMarker`, `isDeprecatedMarker`, `isExtensionMarker` and `numericMarkerKind` ship alongside. `MarkerName` and `NumericKind` are `as const` objects, so `MarkerName.Deprecated` and `'deprecated'` are interchangeable.

A handler that only exists for its marker, like `asInteger` above, still needs an `apply`; a no-op is fine. Leave `match.on` out for decorators that sit on class properties, since `on` only accepts the target of the array the handler lives in.

### Finalizers

A handler sees the draft as the handlers before it left it. When decorators depend on each other, `finalizeMethod(ctx, draft)` and `finalizeController(ctx, draft)` reconcile them once, after every handler of that node ran.

<p align="center"><img src="./assets/finalizers.svg" width="960" alt="Preset app extends left and right, which both extend root. root declares finalizeMethod R, app declares finalizeMethod A, and an inline registry passed to generateMetadata holds methodFinalizers I. loadRegistry collects parents first, so registry.methodFinalizers is R, A, I: root's finalizer appears once although root is reached through two extends paths. For each route method the decorator handlers run, then the JSDoc handlers, then R, A and I, then the success status check and the default response. A preset reached through several extends paths is collected once: root's handlers and its finalizer appear once in this registry."></p>

```typescript
import type { Preset } from '@trapi/core';

export const preset: Preset = {
    name: '@my-org/trapi-preset',
    finalizeMethod: (ctx, draft) => {
        // a Buffer return type streams octets unless a decorator chose the media types
        if (draft.successProduces.length === 0 && ctx.returnType().typeName === 'buffer') {
            draft.successProduces.push('application/octet-stream');
        }
    },
};
```

- `finalizeMethod` runs only for route methods (a verb is set and the method is not hidden), before the success status is checked and the default response is built. Hiding the method or clearing `draft.verb` in a finalizer drops it. `ctx.returnType()` resolves the return type lazily and at most once.
- `finalizeController` runs only for a class a controller handler claimed (`draft.paths` set), before its methods are generated. Unsetting `draft.paths` drops the class.
- Order: the parents' finalizers first, then the preset's own, then those of an inline `registry`. A preset reached through more than one `extends` path contributes its finalizer once. There is no `replaces` for finalizers.

More on finalizers, including what calling `ctx.returnType()` registers: [Finalize hooks](https://trapi.tada5hi.net/guide/advanced-handler-reference#finalize-hooks).

### Testing handlers

The test helpers build decorator arguments and a `HandlerContext` without a TypeScript program:

```typescript
import {
    arrayArg,
    controller,
    createHandlerContext,
    literalArg,
    newControllerDraft,
    setControllerPaths,
} from '@trapi/core';

const handler = controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => setControllerPaths(draft, ctx.argument(0)),
});

const draft = newControllerDraft({ name: 'RolesController', location: 'roles.ts' });

handler.apply(createHandlerContext({ args: [arrayArg(['/roles', '/realms/:id/roles'])] }), draft);
// draft.paths → ['/roles', '/realms/:id/roles']

handler.apply(createHandlerContext({ args: [literalArg('/users')] }), draft);
// draft.paths → ['/users']
```

| Helper | Builds |
| --- | --- |
| `literalArg(value)` | `{ kind: 'literal', raw: value }` |
| `identifierArg(value)` | `{ kind: 'identifier', raw: value }` |
| `arrayArg(items)` | `{ kind: 'array', raw: items }` |
| `objectArg(obj)` | `{ kind: 'object', raw: obj }` |
| `unresolvableArg()` | `{ kind: 'unresolvable', raw: undefined }` |
| `typeArg(type)` | `{ resolve: () => type }` |
| `createHandlerContext({ args?, typeArgs?, host?, parameterType?, decorator? })` | A `HandlerContext`; `host` defaults to `{ name: 'TestHost' }`, `decorator` to `{ name: 'Test' }` |

For an end-to-end check, run `generateMetadata` from `@trapi/metadata` over a fixture controller with your preset, as [`examples/decorators`](https://github.com/tada5hi/trapi/tree/master/examples/decorators) does.

## Loading a preset

`@trapi/metadata` loads the preset for you when you pass `preset` to `generateMetadata`. To drive the loader yourself:

```typescript
import { loadRegistry, loadRegistryByName, resolvePresetByName } from '@trapi/core';

const preset = await resolvePresetByName('@trapi/preset-decorators-express');
const registry = await loadRegistry(preset, { resolver: resolvePresetByName, strict: true });

// the same, without strict
const sameRegistry = await loadRegistryByName('@trapi/preset-decorators-express');
```

- **`resolvePresetByName(input)`** imports a preset module and returns the first of its `preset` export, `default` export or the module itself that has a string `name`. Lookup by input:

  | Input | Tried |
  | --- | --- |
  | `./my-preset`, `../x`, `/abs/path` | the path as given |
  | `module:my-preset` | `my-preset` |
  | `@scope/name` | `@scope/name` |
  | `preset-decorators-express` | `preset-decorators-express`, then `@trapi/preset-decorators-express` |

- **`loadRegistry(preset, { resolver, strict? })`** validates the preset, resolves each `extends` entry through `resolver` (validating and walking it the same way), applies `replaces` and returns a flat `Registry`: one array per handler kind plus `methodFinalizers` and `controllerFinalizers`. `resolver` is any `(name) => Preset | Promise<Preset>`, so tests can resolve from an in-memory map.
- **`loadRegistryByName(input)`** is `resolvePresetByName` followed by `loadRegistry` with `resolvePresetByName` as resolver and `strict` off.
- **`validatePreset(input)`** checks one preset against the zod `presetSchema` without walking `extends`. It throws a `TypeError` for a non-object and a `ValidupError` naming the offending field otherwise; `loadRegistry` wraps both in `CORE_PRESET_INVALID`.
- **`createRegistry(input?)`** builds a `Registry` from just the kinds you pass, defaulting the rest to `[]` and copying the arrays. Pass it to `generateMetadata({ registry })` for one-off handlers without a preset.
- **`mergeRegistries(a, b)`** concatenates two registries kind by kind, finalizers included. Handlers of `b` run after those of `a`, so pass the one that should win on scalar fields as `b`. `generateMetadata` merges a `preset` and an inline `registry` this way, preset first.

## Reading metadata

`Metadata` is what an extractor produces and what `@trapi/swagger` consumes: `{ controllers: Controller[]; referenceTypes: Record<string, ReferenceType> }`. `isMetadata(input)` checks that shape on unknown input, for example a parsed `metadata.json`. A `Controller` has `paths` (always non-empty; `['']` without a path argument), `methods`, `tags`, `consumes`, `produces`, `responses`, `security`, `extensions`, `hidden` and `deprecated`; a `Method` adds `method` (the verb), `path`, `parameters` and its return `type`; a `Parameter` has `in` (a `ParameterSource`), `name`, `required` and `type`.

Every type node is one member of the `Type` union, told apart by `typeName`:

<p align="center"><img src="./assets/type-map.svg" width="960" alt="Every node of the Type union carries a typeName. PrimitiveType, checked by isPrimitiveType, covers string, boolean, bigint, any, object, undefined, file, byte, date, datetime, binary, buffer and the numeric kinds; a Date is datetime, or date under the JSDoc tag @isDate. The numeric kinds integer, long, float and double have the guards isIntegerType, isLongType, isFloatType and isDoubleType and come from the numeric markers int, long, float and double; a plain number without a marker is double. Composite types are array with elementType, tuple with elements, union and intersection with members, enum with members and nestedObjectLiteral with properties. ReferenceType, checked by isReferenceType, covers refObject with properties, refEnum with members and memberNames, and refAlias with type; each has a refName and is stored in Metadata.referenceTypes. void and never sit outside PrimitiveType. Every typeName has a guard named after it, which checks typeName only."></p>

```typescript
import type { Metadata, Type } from '@trapi/core';
import { isArrayType, isMetadata, isRefObjectType, isReferenceType } from '@trapi/core';

function describe(type: Type, metadata: Metadata): string {
    if (isArrayType(type)) {
        return `${describe(type.elementType, metadata)}[]`;
    }

    if (isReferenceType(type)) {
        const stored = metadata.referenceTypes[type.refName];

        return stored && isRefObjectType(stored) ? `${type.refName} { ${stored.properties.map((p) => p.name).join(', ')} }` : type.refName;
    }

    return type.typeName;
}

export function listReturnTypes(input: unknown): string[] {
    if (!isMetadata(input)) {
        throw new Error('not TRAPI metadata');
    }

    return input.controllers.flatMap((c) => c.methods.map((m) => `${m.name}: ${describe(m.type as Type, input)}`));
}
```

`TypeName` lists every `typeName` value. TRAPI keeps TypeScript constructs that OpenAPI cannot express (tuples, intersections, `never`) as their own nodes; lossy conversions happen only in `@trapi/swagger`.

## Errors

`CoreError` extends `BaseError` from [`@ebec/core`](https://github.com/Tada5hi/ebec). It does **not** extend `MetadataError` from `@trapi/metadata`; the two are sibling roots, so catch `BaseError` to handle both. `isCoreError(input)` narrows unknown values.

<p align="center"><img src="./assets/errors.svg" width="960" alt="A method handler with match.on 'class' fails validation in loadRegistry with CORE_PRESET_INVALID and the message Property methods[0].match.on is invalid. resolvePresetByName('does-not-exist') throws CORE_PRESET_NOT_FOUND. Presets a and b that extend each other throw CORE_PRESET_CYCLE with the message Preset cycle detected: a -> b -> a. With strict: true, a Get handler with replaces: true and no parent Get throws CORE_PRESET_REPLACES_NO_MATCH. requireNumber on an argument that cannot be resolved throws CORE_DECORATOR_ARGUMENT_INVALID naming the decorator and host. loadRegistry wraps validation failures in CORE_PRESET_INVALID, while validatePreset called directly throws a ValidupError."></p>

| `CoreErrorCode` | Value | When |
| --- | --- | --- |
| `PRESET_NOT_FOUND` | `CORE_PRESET_NOT_FOUND` | Every lookup path for the preset failed with a module-not-found error (`ERR_MODULE_NOT_FOUND`, `MODULE_NOT_FOUND`, `ENOENT`). |
| `PRESET_INVALID` | `CORE_PRESET_INVALID` | The preset module was found but failed to load (syntax error, throw at import time), or a preset in the `extends` chain failed schema validation. |
| `PRESET_CYCLE` | `CORE_PRESET_CYCLE` | The `extends` graph contains a cycle; the message lists the path. |
| `PRESET_REPLACES_NO_MATCH` | `CORE_PRESET_REPLACES_NO_MATCH` | A `replaces` handler removed no inherited handler; thrown only with `strict: true`. |
| `DECORATOR_ARGUMENT_INVALID` | `CORE_DECORATOR_ARGUMENT_INVALID` | A strict reader (`requireArgument`, `requireNumber`, `requireString`) found an argument it cannot read. |

```typescript
import { CoreErrorCode, isCoreError, loadRegistryByName } from '@trapi/core';

try {
    await loadRegistryByName('@my-org/trapi-preset');
} catch (e) {
    if (isCoreError(e) && e.code === CoreErrorCode.PRESET_NOT_FOUND) {
        console.error('Install the preset first.');
    }

    throw e;
}
```

## API

The stable public surface is documented in the [API Reference](https://trapi.tada5hi.net/guide/metadata-api-reference). Anything not listed there should be treated as internal even if it is exported, and may change without a major version bump. The [Handler Reference](https://trapi.tada5hi.net/guide/advanced-handler-reference) covers contexts, writers, readers, markers and registry construction in depth.

| Group | Exports |
| --- | --- |
| **Metadata types** | `Metadata`, `isMetadata`, `Controller`, `Method`, `MethodType`, `Parameter`, `ArrayParameter`, `Response`, `Example`, `Security`, `Validator`, `Validators`, `ValidatorMeta`, `Extension`, `ExtensionType`, `ResolverProperty`, `VariableType` |
| **Type union** | `Type`, `BaseType`, `PrimitiveType`, `ReferenceType`, `ReferenceTypes`, `StringType`, `ObjectType`, `RefObjectType`, `RefAliasType`, `RefEnumType`, `NestedObjectLiteralType`, `UnionType`, `IntersectionType`, `TupleType`, … and one `is*Type` guard per `typeName`, plus `isPrimitiveType` and `isReferenceType` |
| **Constants** | `TypeName`, `UtilityTypeName`, `ParameterSource`, `CollectionFormat`, `MethodName`, `ValidatorName`, `ParamKind`, `CollectionKind`, `MarkerName`, `NumericKind`, `DecoratorTargetKind`, `DecoratorArgumentKindName` |
| **Preset contract** | `Preset`, `Registry`, `ControllerHandler`, `MethodHandler`, `ParameterHandler`, `ControllerJsDocHandler`, `MethodJsDocHandler`, `ParameterJsDocHandler`, `ControllerFinalizer`, `MethodFinalizer`, `HandlerContext`, `JsDocHandlerContext`, `ControllerDraft`, `MethodDraft`, `ParameterDraft`, `DecoratorSource`, `DecoratorArgument`, `JsDocSource`, `ResolverMarker`, `ReplacesPolicy`, `PresetResolver`, `LoadRegistryOptions`, `UnmatchedDecoratorReport` |
| **Authoring helpers** | `controller`, `method`, `parameter`, `controllerJsDoc`, `methodJsDoc`, `parameterJsDoc`, `into`, `append`, `flag`, `readString`, `readNumber`, `readBoolean`, `readStringOrStringArray`, `requireArgument`, `requireNumber`, `requireString`, `setControllerPaths`, `setMethodPath`, `newControllerDraft`, `newMethodDraft`, `newParameterDraft`, `matches`, `matchesJsDoc` |
| **Loader and validation** | `loadRegistry`, `loadRegistryByName`, `resolvePresetByName`, `validatePreset`, `createRegistry`, `mergeRegistries`, `presetSchema` and the per-kind handler schemas (`controllerHandlerSchema`, …) |
| **Marker lookups** | `namesForMarker`, `tagsForMarker`, `isHiddenMarker`, `isDeprecatedMarker`, `isExtensionMarker`, `numericMarkerKind` |
| **Errors** | `CoreError`, `CoreErrorCode`, `isCoreError` |
| **Test helpers** | `literalArg`, `identifierArg`, `arrayArg`, `objectArg`, `typeArg`, `unresolvableArg`, `createHandlerContext` |

## Notes

- **A preset reached through several `extends` paths is collected once.** If two parents share a base, the base's handlers and finalizers are registered once, at their first occurrence. A base handler that one path replaced stays in the registry when another path still inherits it.
- **`replaces` works on inherited handlers only**, and an inline `registry` cannot carry it: `replaces` is applied by `loadRegistry`, which an inline registry never passes through. To remove a preset handler, author a preset with `replaces` and pass it as `preset`.
- **Unmatched decorators are skipped silently** unless `@trapi/metadata` runs with `strict: true` (report) or `strict: 'throw'`. JSDoc tags are not part of that report.
- **`into()` ignores what it cannot write.** An object, array or unresolvable argument leaves the field unchanged; use a custom `apply` or a strict reader when a wrong value must fail.
- **`TypeName`, `UtilityTypeName` and `ValidatorName` are TypeScript enums**; the other constants are `as const` objects with a same-named type, so both `ParamKind.Body` and `'body'` type-check.

## Structure

```
src/
├── controller/    # Controller + IControllerGenerator port
├── method/        # Method, MethodType, MethodName
├── parameter/     # Parameter, IParameterGenerator, ParameterSource, CollectionFormat
├── generator/     # Example, Response, Security
├── validator/     # Validator, ValidatorMeta, Validators, ValidatorName
├── resolver/      # Type union, BaseType, TypeName, Extension, type guards
├── metadata/      # Metadata wrapper + isMetadata guard
├── decorator/     # Preset machinery (handlers, drafts, helpers, loader, validator, test helpers)
├── error/         # CoreError, CoreErrorCode
├── types.ts       # VariableType
└── index.ts       # Public entry point
```

## License

Made with 💚

Published under [MIT License](https://github.com/tada5hi/trapi/blob/master/LICENSE).
