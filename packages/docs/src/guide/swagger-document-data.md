# Document Data

`data` on `SwaggerGenerateOptions` carries the document-level content of the OpenAPI spec: the `info` block, servers, security schemes, default content types.

```typescript
type SwaggerGenerateData = {
    name?: string;
    version?: string;
    description?: string;
    license?: string;
    servers?: string | string[] | ServerOption | ServerOption[];
    securityDefinitions?: SecurityDefinitions;
    consumes?: string[];
    produces?: string[];
    responses?: Response[];
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
    operationIdStrategy?: 'method' | 'path';
    extra?: Record<string, any>;
};
```

## info Block

`name`, `version`, `description`, `license` populate the `info` block. Each falls back to the corresponding field of the nearest `package.json` when omitted — convenient locally, easy to overlook in CI. Prefer to pass them explicitly for builds.

```typescript
data: {
    name: 'Example API',
    version: '1.2.3',
    description: 'REST endpoints for the example service.',
    license: 'MIT',
}
```

## Servers

```typescript
type ServerOption = {
    url: string;
    description?: string;
};
```

Accepts:

- a single URL string
- an array of URL strings
- a `ServerOption` object
- an array of `ServerOption` objects

```typescript
// String shorthand
servers: 'https://api.example.com'

// Multiple endpoints
servers: [
    { url: 'https://api.example.com', description: 'Production' },
    { url: 'https://staging.example.com', description: 'Staging' },
]
```

In OpenAPI 2.0 there is no `servers` array — the emitter maps the first entry to `host` + `basePath` + `schemes`.

## Security Schemes

`securityDefinitions` accepts a map of named schemes. The exact shape follows the OpenAPI spec for the version you emit.

```typescript
data: {
    securityDefinitions: {
        basicAuth: {
            type: 'http',
            scheme: 'basic',
        },
        apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
        },
        oauth2: {
            type: 'oauth2',
            flows: {
                authorizationCode: {
                    authorizationUrl: 'https://auth.example.com/authorize',
                    tokenUrl: 'https://auth.example.com/token',
                    scopes: { 'read:users': 'Read users', 'write:users': 'Write users' },
                },
            },
        },
    },
}
```

Supported schemes: `apiKey` (header/query), `http` with `scheme: 'basic'`, and `oauth2` with any of the four OAuth2 flow types (`implicit`, `password`, `authorizationCode`, `clientCredentials`). For bearer-token JWT auth you can model it as an API key in the `Authorization` header, or extend the spec through `data.extra` if you need a non-basic HTTP scheme.

Operation-level `security` is driven by the `@Security` decorator on your controllers and methods — the value you pass here only *defines* the schemes.

## Default Content Types

`consumes` and `produces` become the default media types for request bodies and responses respectively. Both emitters honour them, but they surface differently: v2 writes the top-level `consumes`/`produces` keys, while v3 folds them into the `requestBody.content` and `responses.<code>.content` keys — OpenAPI 3 removed the document-level fields.

```typescript
data: {
    consumes: ['application/json'],
    produces: ['application/json', 'application/xml'],
}
```

Precedence: `@Consumes`/`@Produces` on a controller and on a method are **merged** (controller entries first) and win over these defaults. A `@Produces` on a specific response wins over the method's in v3. When nothing is declared anywhere, a request body with file parameters uses `multipart/form-data`, any other form body uses `application/x-www-form-urlencoded`, and everything else falls back to these defaults — or to `application/json` when they are unset too.

## Document Responses

`responses` is merged into **every** emitted operation. OpenAPI has no document-level `responses` field, so without it a spec-wide error shape has to be repeated on every method — or patched onto the finished document, which cannot know which paths exist.

```typescript
data: {
    responses: [
        {
            name: 'default',
            status: 'default',
            description: 'Error',
            schema: { typeName: 'refObject', refName: 'ErrorResponse', properties: [] },
        },
    ],
}
```

Entries are `Response` objects from `@trapi/core`, not raw OpenAPI fragments, so one config works for every emitter: v2 writes `{ description, schema: { $ref: '#/definitions/…' } }` and v3 writes `{ description, content: { 'application/json': { schema: { $ref: '#/components/schemas/…' } } } }`.

A `schema` may reference a type your controllers never mention — the `$ref` is emitted without requiring the type to be in the metadata. Supply the component itself through [`extra`](#extra) and the two compose:

```typescript
data: {
    responses: [ /* … as above … */ ],
    extra: { components: { schemas: { ErrorResponse: { type: 'object' } } } },
}
```

Precedence: a method's own response with the same `status` wins. There is no per-operation opt-out, so reserve this for responses that genuinely apply everywhere — a `default` error shape is the intended case; `404` is usually not.

## Collection Format

`collectionFormat` controls how array-valued query parameters are serialised in OpenAPI 2.0. It has no effect on v3 emitters.

```typescript
data: { collectionFormat: 'multi' }  // ?tag=a&tag=b
```

## Operation IDs

`operationIdStrategy` selects how a default `operationId` is derived. An explicit `operationId` on a method always wins over both strategies.

### `'method'` (default)

`Ucfirst(methodName)`. When two operations end up with the same id — the same method name on two controllers, or one method mounted at several controller paths — the later one gets a positional `_2`, `_3`, … suffix. That suffix depends on emission order, so adding, removing or reordering a controller can shift the ids of unrelated operations. It is kept as the default for backwards compatibility.

### `'path'`

The HTTP verb plus the emitted URL segments, with `{param}` becoming `By<Param>`:

```typescript
data: { operationIdStrategy: 'path' }
```

| Operation | `operationId` |
|---|---|
| `GET /roles` | `getRoles` |
| `GET /roles/{id}` | `getRolesById` |
| `POST /roles` | `postRoles` |
| `GET /realms/{realmId}/roles` | `getRealmsByRealmIdRoles` |
| `DELETE /realms/{realmId}/roles/{id}` | `deleteRealmsByRealmIdRolesById` |

Details:

- The verb is not aliased — `POST` yields `post…`, not `create…`.
- The root path `/` yields the bare verb (`get`, `post`). One verb per path makes it unique by construction.
- Non-alphanumerics are separators: `by-id` becomes `ById`, `user.profile` becomes `UserProfile`. The lowercase verb prefix keeps the id identifier-safe even when a segment starts with a digit (`/2fa` → `get2fa`).
- A multi-mount controller gets a distinct id per mount with no numeric suffix, because the path differs.

Two different paths can still normalise to the same id — `/users/{id}` and `/users/by-id` both yield `getUsersById`. The `_2` suffix remains as the backstop for that case; set an explicit `operationId` on one of the two to remove the ambiguity.

## Extra Properties

`extra` is merged into the generated spec as a raw fragment. Useful for `x-*` vendor extensions or properties TRAPI does not surface directly:

```typescript
data: {
    extra: {
        'x-audience': ['internal', 'partners'],
        tags: [
            { name: 'Users', description: 'User management' },
            { name: 'Orders', description: 'Order processing' },
        ],
    },
}
```

Generated properties take precedence where keys overlap — `extra` cannot overwrite content TRAPI has produced from your decorators.

`extra` is built *before* generation, so it cannot key on values the emitter assigns — per-operation additions that need the emitted path or `operationId` have nothing to attach to. For those, use the CLI's [`swagger.transform`](/guide/cli#post-processing-the-document) hook, which runs on the finished document just before it is written.
