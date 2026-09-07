# Handler Reference

The complete authoring surface for v2 handlers. Read [Custom Presets](/guide/advanced-custom-presets) first for the conceptual overview — this page is the symbol-by-symbol reference.

All symbols ship from `@trapi/core` (no `typescript` dependency).

## HandlerContext

Decorator handlers receive a `HandlerContext` as the first argument to `apply`:

```typescript
type HandlerContext = {
    host: { name: string; parentName?: string };
    argument: (index: number) => DecoratorArgument | undefined;
    arguments: () => DecoratorArgument[];
    typeArgument: (index: number) => DecoratorTypeArgument | undefined;
    typeArguments: () => DecoratorTypeArgument[];
    parameterType: () => Type | undefined;
};

type DecoratorArgument = {
    raw: unknown;
    kind: 'literal' | 'object' | 'array' | 'identifier' | 'unresolvable';
};

type DecoratorTypeArgument = {
    resolve: () => Type;
};
```

| Method | Returns | Notes |
| --- | --- | --- |
| `host.name` | class / method / parameter name as written in source | always defined |
| `host.parentName` | enclosing class name | populated for method and parameter handlers |
| `argument(i)` | the `i`-th positional argument | `undefined` if the user wrote fewer args |
| `arguments()` | every positional argument | use for spread-like semantics (`@Tags('a','b','c')`) |
| `typeArgument(i)` | the `i`-th generic type argument as a lazy resolver | `.resolve()` triggers the TS type checker — only call when needed |
| `typeArguments()` | every type argument lazily | same lazy semantics |
| `parameterType()` | the resolved type of the parameter being decorated | parameter handlers only — returns `undefined` for controller/method handlers |

### Argument kinds

`DecoratorArgument.kind` discriminates how the argument was written:

| kind | What it is | Example | `raw` shape |
| --- | --- | --- | --- |
| `'literal'` | string / number / boolean / null literal | `@Path('/users')` | the literal value |
| `'identifier'` | reference that the compiler folds to a constant | `@Path(USERS_PATH)`, an imported or re-exported constant, `PATHS.users`, an enum member, or a template expression whose substitutions are all constants | the resolved value |
| `'array'` | array literal | `@Tags('a', ['b', 'c'])` second arg | `string[]` (or mixed) |
| `'object'` | object literal | `@Security({ bearer: ['scope'] })` | `Record<string, unknown>` |
| `'unresolvable'` | argument the static analyser couldn't reduce | `@Example(buildExample())` | `undefined` |

Always check `kind` before reading `raw` — `unresolvable` arguments carry no value.

```typescript
parameter({
    match: { name: 'Query', on: 'parameter' },
    apply: (ctx, draft) => {
        const arg = ctx.argument(0);
        if (arg?.kind === 'literal' && typeof arg.raw === 'string') {
            draft.in = ParamKind.QueryProp;
            draft.name = arg.raw;
        } else {
            draft.in = ParamKind.Query;
        }
    },
});
```

## JsDocHandlerContext

JSDoc handlers receive a different context shape:

```typescript
type JsDocHandlerContext = {
    host: { name: string; parentName?: string };
    source: JsDocSource;
    parameterType: () => Type | undefined;
};

type JsDocSource = {
    tag: string;                          // e.g. 'summary' for `/** @summary ... */`
    text?: string;                        // text after the tag
    typeExpression?: { resolve: () => Type };  // e.g. `@type {string}` typedef
    parameterName?: string;               // for `@param <name>` style tags
    target: 'class' | 'method' | 'parameter' | 'property';
    host: { name: string; parentName?: string };
};
```

`source.text` covers most cases:

```typescript
methodJsDoc({
    match: { tag: 'summary' },
    apply: (ctx, draft) => {
        if (ctx.source.text) draft.summary = ctx.source.text;
    },
});
```

Decorator handlers always run before JSDoc handlers on the same node — JSDoc acts as the override layer.

## `replaces` semantics

When a preset uses `extends`, parent handlers run additively by default. To shadow a parent handler, set `replaces`:

```typescript
type ReplacesPolicy = true | string;
```

The three cases:

### `replaces: true` — shadow every parent

```typescript
const preset: Preset = {
    name: 'my-app/preset',
    extends: ['@trapi/preset-decorators-express', '@my-org/legacy-preset'],
    controllers: [
        controller({
            match: { name: 'Controller', on: 'class' },
            replaces: true,                   // shadows BOTH parents' Controller handlers
            apply: (ctx, draft) => { /* ... */ },
        }),
    ],
};
```

Use when you want full control over a decorator and don't care which parent contributed the original handler.

### `replaces: '<presetName>'` — shadow one specific parent

```typescript
controller({
    match: { name: 'Controller', on: 'class' },
    replaces: '@trapi/preset-decorators-express',   // shadows only the express preset's handler
    apply: (ctx, draft) => { /* ... */ },
});
```

Use when extending multiple presets and you only want to override one.

### Same-preset siblings — always additive

```typescript
const preset: Preset = {
    name: 'my-app/preset',
    methods: [
        method({ match: { name: 'Get', on: 'method' }, apply: (_ctx, draft) => { draft.verb = 'get'; } }),
        method({ match: { name: 'Get', on: 'method' }, apply: (_ctx, draft) => { draft.tags.push('http'); } }),
    ],
};
```

Both run, in source order. `replaces` only affects **inherited** handlers — it has no effect on handlers in the same preset.

### Strict mode

`loadRegistry(preset, { resolver, strict: true })` throws `CoreError(PRESET_REPLACES_NO_MATCH)` when a `replaces` entry doesn't shadow any parent. Useful as a CI gate when the parent preset evolves.

## Apply helpers

Three writer helpers cut handler boilerplate.

### `into(key)`

Scalar writer. Use for fields that hold a single value (`path`, `description`, `verb`, …). Object/array/unresolvable arguments are intentionally ignored — use `append` for arrays.

```typescript
into(key).positional(index)        // read positional arg, write to draft[key]
into(key).typeArgument(index = 0)  // resolve type arg, write to draft[key]
```

```typescript
method({ match: { name: 'Path', on: 'method' }, apply: into('path').positional(0) });
```

### `append(key)`

Array writer. Use for fields that hold lists (`tags`, `produces`, `security`, …). Array arguments are flattened; scalar arguments are pushed as-is.

```typescript
append(key).positional(index)   // push the i-th argument
append(key).positionalAll()     // push every argument (spread-style decorators)
```

```typescript
method({ match: { name: 'Tags', on: 'method' }, apply: append('tags').positionalAll() });
```

### `flag(key, value = true)`

Unconditional setter — useful for boolean flags or fixed values that don't depend on argument shape.

```typescript
controller({ match: { name: 'Hidden', on: 'class' }, apply: flag('hidden') });
method({ match: { name: 'GetOnly', on: 'method' }, apply: flag('verb', 'get') });
```

## Argument readers

Lower-level helpers that handle the common `kind` checks:

| Helper | Accepts | Returns |
| --- | --- | --- |
| `readString(arg)` | `'literal'` string, `'identifier'` resolving to string | `string \| undefined` |
| `readNumber(arg)` | `'literal'` number | `number \| undefined` |
| `readBoolean(arg)` | `'literal'` boolean | `boolean \| undefined` |
| `readStringOrStringArray(arg)` | string literal/identifier OR array of all-strings | `string[] \| undefined` |

`readStringOrStringArray` is all-or-nothing — if **any** array element is non-string the helper returns `undefined`, never a partial array.

```typescript
parameter({
    match: { name: 'Header', on: 'parameter' },
    apply: (ctx, draft) => {
        const name = readString(ctx.argument(0));
        draft.in = ParamKind.Header;
        if (name) draft.name = name;
    },
});
```

## Path helpers

Two convenience wrappers around the readers for the most common shapes.

### `setControllerPaths(draft, arg)`

Reads the first argument as a string-or-string-array and writes to `draft.paths`, defaulting to `['']` when missing or unresolvable. Use inside a `controller(...)` handler.

```typescript
controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => setControllerPaths(draft, ctx.argument(0)),
});
```

### `setMethodPath(draft, arg)`

Reads the first argument as a string and writes to `draft.path` if present. Leaves the field untouched otherwise (the orchestrator initialises it to `''`).

```typescript
method({
    match: { name: 'Get', on: 'method' },
    apply: (ctx, draft) => {
        draft.verb = 'get';
        setMethodPath(draft, ctx.argument(0));
    },
});
```

## Markers

`marker` tags a handler with a semantic concept the type resolver consults. Closed concept set:

```typescript
type ResolverMarker =
    | 'hidden'
    | 'deprecated'
    | 'extension'
    | { numeric: 'int' | 'long' | 'float' | 'double' };
```

| Marker | Used by | Effect |
| --- | --- | --- |
| `'hidden'` | resolver | excludes the class/method/property from the spec |
| `'deprecated'` | resolver | flags as deprecated |
| `'extension'` | resolver | reads `x-*` extensions (key/value from positional args 0/1) on properties |
| `{ numeric: 'int' \| 'long' \| 'float' \| 'double' }` | resolver | narrows `number` to the specified numeric kind |

`MarkerName` and `NumericKind` are `as const` objects with the same value union, so `MarkerName.Hidden` and `'hidden'` both type-check.

```typescript
import { MarkerName, NumericKind, controller, flag, parameter } from '@trapi/core';

controller({
    match: { name: 'Skip', on: 'class' },         // renamed @Skip
    apply: flag('hidden'),
    marker: MarkerName.Hidden,                    // resolver treats @Skip as hidden
});

parameter({
    match: { name: 'AsInteger', on: 'parameter' }, // renamed @AsInteger
    apply: (_ctx, draft) => {
        draft.validators.isInt = { value: 'int' };
    },
    marker: { numeric: NumericKind.Int },
});
```

JSDoc handlers carry markers too — `marker: 'deprecated'` on a JSDoc handler matching `tag: 'gone'` makes the resolver treat `@gone` as deprecated.

## Registry construction

For programmatic wiring (custom generators, fixture-driven tests, ad-hoc handler injection):

### `createRegistry(input?)`

```typescript
function createRegistry(input?: Partial<Registry>): Registry;
```

Build a `Registry`, optionally seeded with handler arrays. Any kind omitted from `input` falls back to an empty array. The provided arrays are copied — mutating the result does not affect `input`.

```typescript
import { createRegistry, method } from '@trapi/core';

const registry = createRegistry({
    methods: [
        method({ match: { name: 'Get', on: 'method' }, apply: (_ctx, draft) => { draft.verb = 'get'; } }),
    ],
});

await generateMetadata({ entryPoint: 'src/**/*.ts', registry });
```

### `mergeRegistries(a, b)`

```typescript
function mergeRegistries(a: Registry, b: Registry): Registry;
```

Concatenate two registries kind-by-kind. Earlier handlers run first inside the orchestrator, so callers wanting override-by-running-later semantics should pass the dominant registry as `b`.

### `validatePreset(input)`

```typescript
async function validatePreset(input: unknown): Promise<Preset>;
```

Validate an unknown value against the v2 `Preset` zod schema. Throws with a path to the offending field. Useful when loading user-supplied presets without going through `loadRegistry` (e.g. building tooling around presets).

## Marker discovery

For tooling that needs to enumerate decorator names by concept:

### `namesForMarker(registry, predicate)`

```typescript
function namesForMarker(
    registry: Registry,
    predicate: (marker: ResolverMarker) => boolean,
): Set<string>;
```

Collect the unique decorator names whose `marker` matches the predicate. Used by the type resolver to find preset-renamed decorators.

```typescript
import { namesForMarker, isHiddenMarker } from '@trapi/core';

const hiddenDecoratorNames = namesForMarker(registry, isHiddenMarker);
// → Set { 'Hidden', 'Skip' } if the preset registers both
```

Predicate helpers ship alongside: `isHiddenMarker`, `isDeprecatedMarker`, `isExtensionMarker`, `numericMarkerKind` (returns the numeric kind or `undefined`).

### `tagsForMarker(registry, predicate)`

```typescript
function tagsForMarker(
    registry: Registry,
    predicate: (marker: ResolverMarker) => boolean,
): Set<string>;
```

JSDoc analogue — collects unique JSDoc tag names whose `marker` matches.

## Identity helpers

```typescript
const controller = (handler: ControllerHandler): ControllerHandler => handler;
const method = (handler: MethodHandler): MethodHandler => handler;
const parameter = (handler: ParameterHandler): ParameterHandler => handler;
const controllerJsDoc = (handler: ControllerJsDocHandler): ControllerJsDocHandler => handler;
const methodJsDoc = (handler: MethodJsDocHandler): MethodJsDocHandler => handler;
const parameterJsDoc = (handler: ParameterJsDocHandler): ParameterJsDocHandler => handler;
```

Pure pass-through. Their job is to preserve the narrow handler type at the declaration site so TypeScript catches `match.on` typos and `apply`-signature mismatches inline.

## Test helpers

`@trapi/core/test-helpers` (or `import { ... } from '@trapi/core'`) exports utilities for unit-testing handlers without a TypeScript program:

```typescript
import {
    literalArg, identifierArg, arrayArg, objectArg, unresolvableArg, typeArg,
    createHandlerContext,
    newControllerDraft,
} from '@trapi/core';

const ctx = createHandlerContext({
    host: { name: 'UsersController' },
    args: [literalArg('/users')],
});

const draft = newControllerDraft({ name: 'UsersController', location: 'test.ts' });
controllerHandler.apply(ctx, draft);

expect(draft.paths).toEqual(['/users']);
```

| Helper | Builds |
| --- | --- |
| `literalArg(value)` | `{ kind: 'literal', raw: value }` |
| `identifierArg(value)` | `{ kind: 'identifier', raw: value }` |
| `arrayArg(items)` | `{ kind: 'array', raw: items }` |
| `objectArg(obj)` | `{ kind: 'object', raw: obj }` |
| `unresolvableArg()` | `{ kind: 'unresolvable', raw: undefined }` |
| `typeArg(type)` | `{ resolve: () => type }` |
| `createHandlerContext({ host?, args?, typeArgs?, parameterType? })` | a `HandlerContext` |
