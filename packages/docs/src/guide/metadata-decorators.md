# Decorators & Presets

TRAPI's core design decision is that decorators are **configurable**. You tell it which decorator in your code represents which concept — TRAPI never assumes a specific naming scheme.

A **preset** is a set of decorator and JSDoc handlers that map decorator names to draft-mutating functions. The preset drives the generator pipeline.

## Concept Surface

Each handler can carry an optional `marker` that tags it with a semantic concept. The type resolver consults markers (not hardcoded names) to find decorators like `@Hidden`, `@IsInt`, etc., so preset authors can rename freely.

| Concept | Used by | Example marker |
| --- | --- | --- |
| `'hidden'` | excludes a class/method/property from the spec | `marker: 'hidden'` |
| `'deprecated'` | flags as deprecated | `marker: 'deprecated'` |
| `'extension'` | reads `x-*` extensions (key/value from positional args 0 and 1) | `marker: 'extension'` |
| `{ numeric: 'int' \| 'long' \| 'float' \| 'double' }` | narrows `number` types | `marker: { numeric: 'int' }` |

Other concepts (HTTP verbs, parameter sources, content types) are conveyed directly through draft mutations — handlers set `draft.verb = 'get'`, `draft.in = ParamKind.Body`, append to `draft.tags`, and so on.

## Handlers

A handler matches by name and contributes to a draft:

```typescript
import { ParamKind, controller, method, parameter } from '@trapi/core';

const controllerControllerHandler = controller({
    match: { name: 'Controller', on: 'class' },
    apply: (ctx, draft) => {
        const arg = ctx.argument(0);
        if (arg?.kind === 'literal' && typeof arg.raw === 'string') {
            draft.paths = [arg.raw];
        } else if (arg?.kind === 'array' && Array.isArray(arg.raw)) {
            draft.paths = arg.raw.filter((v): v is string => typeof v === 'string');
        } else {
            draft.paths = [''];
        }
    },
});

const methodGetHandler = method({
    match: { name: 'Get', on: 'method' },
    apply: (ctx, draft) => {
        draft.verb = 'get';
        const path = ctx.argument(0);
        if (path && path.kind === 'literal' && typeof path.raw === 'string') {
            draft.path = path.raw;
        }
    },
});

const parameterBodyHandler = parameter({
    match: { name: 'Body', on: 'parameter' },
    apply: (_ctx, draft) => { draft.in = ParamKind.Body; },
});
```

`controller(...)`, `method(...)`, `parameter(...)` are identity helpers that preserve narrow types at the declaration site.

### Handler Context

The first argument to `apply` is a `HandlerContext`:

```typescript
type HandlerContext = {
    host: { name: string; parentName?: string };          // class/method name
    argument: (i: number) => DecoratorArgument | undefined;
    arguments: () => DecoratorArgument[];
    typeArgument: (i: number) => DecoratorTypeArgument | undefined;
    typeArguments: () => DecoratorTypeArgument[];
    parameterType: () => Type | undefined;                // resolved type of the parameter (parameter handlers only)
};

type DecoratorArgument = {
    raw: unknown;
    kind: 'literal' | 'object' | 'array' | 'identifier' | 'unresolvable';
};
```

`DecoratorTypeArgument.resolve()` lazily resolves a generic type argument (e.g. the `T` in `@Description<T>(...)`) into a metadata `Type`. Calling it triggers the TS type resolver — only do so when needed.

### JSDoc Handlers

JSDoc tag handlers register under `controllerJsDoc` / `methodJsDoc` / `parameterJsDoc`. Their `apply` receives a `JsDocHandlerContext` with `source.text`, `source.parameterName`, and `source.typeExpression?.resolve()`.

Decorator handlers always run before JSDoc handlers on the same node — JSDoc acts as the override layer.

## Built-in Helpers

For routine cases, prebuilt helpers cut boilerplate:

```typescript
import { append, controller, flag, into, method } from '@trapi/core';

method({ match: { name: 'Path', on: 'method' }, apply: into('path').positional(0) });
method({ match: { name: 'Tags', on: 'method' }, apply: append('tags').positionalAll() });
controller({ match: { name: 'Hidden', on: 'class' }, apply: flag('hidden'), marker: 'hidden' });
```

- `into(key).positional(i)` writes the literal at argument index `i` into `draft[key]`. Object/array/unresolvable kinds are intentionally ignored — use `append` for arrays.
- `append(key).positional(i)` / `.positionalAll()` push values onto an array on the draft. Array arguments are flattened.
- `flag(key, value = true)` unconditionally sets a flag. The second argument is optional — pass it for shorthand non-boolean assignments (e.g. `flag('verb', 'get')` for a verb-only HTTP method handler that doesn't read a path argument).

## Multi-Mount Controllers

`@Controller` and `@Mount` accept either a single path or an array of paths, letting one controller serve the same set of endpoints under multiple URL prefixes:

```typescript
import { Controller, Get, Params } from '@decorators/express';

@Controller(['/roles', '/realms/:realmId/roles'])
export class RolesController {
    @Get()
    list(): Role[] { /* ... */ }

    @Get('/:id')
    detail(@Params('id') id: string): Role { /* ... */ }
}
```

The metadata exposes every mount as `Controller.paths: string[]` (always non-empty). The swagger emitter expands the cross product:

```text
GET  /roles
GET  /roles/{id}
GET  /realms/{realmId}/roles
GET  /realms/{realmId}/roles/{id}
```

A few details worth knowing:

- **OperationId disambiguation** — OpenAPI requires `operationId` to be unique. When the same method is emitted at multiple paths, the first keeps its base id and subsequent emissions get a numeric suffix (`list`, `list_2`, …). Set `operationId` explicitly via your preset's metadata if you want stable, predictable identifiers.
- **Per-path parameter filtering** — path parameters declared on the method appear only on operations whose URL template actually contains them. `@Path('realmId')` only shows up under `/realms/{realmId}/roles*`, not under `/roles*`.
- **Validation across mounts** — `@Path('name')` is valid as long as `:name` (or `{name}`) appears in **at least one** `(controllerPath × methodPath)` combination.
- **Method paths stay scalar** — only controller-level paths support multiple values; method paths (`@Get('/:id')`) take a single string.

## Presets

A **`Preset`** is a `name`, optional `extends`, and arrays of handlers per kind:

```typescript
type Preset = {
    name: string;
    extends?: string[];
    controllers?: ControllerHandler[];
    methods?: MethodHandler[];
    parameters?: ParameterHandler[];
    controllerJsDoc?: ControllerJsDocHandler[];
    methodJsDoc?: MethodJsDocHandler[];
    parameterJsDoc?: ParameterJsDocHandler[];
};
```

`extends` lets a preset build on another by package name — TRAPI loads each referenced preset recursively. Handlers run additively unless a child handler sets `replaces` (see [Custom Presets — Extending](/guide/advanced-custom-presets#extending-another-preset)).

Shipped presets:

| Preset | Framework |
| --- | --- |
| `@trapi/preset-decorators-express` | [@decorators/express](https://github.com/serhiisol/node-decorators) — self-contained (routing + TRAPI markers + JSDoc handlers) |
| `@trapi/preset-typescript-rest` | [typescript-rest](https://github.com/thiagobustamante/typescript-rest) — self-contained (routing + TRAPI markers + JSDoc handlers) |

Use one by name:

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-typescript-rest',
});
```

Presets are resolved via Node's module resolution and validated against the `Preset` schema before any handler runs. Misshapen presets fail loud at load time with a path to the offending field.

## Writing Your Own

If your decorators live in-house, write a preset and load it directly. To reuse it across projects, publish it as a [Custom Preset](/guide/advanced-custom-presets).