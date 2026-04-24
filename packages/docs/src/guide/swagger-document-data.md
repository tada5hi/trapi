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
    collectionFormat?: 'csv' | 'ssv' | 'tsv' | 'pipes' | 'multi';
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

`consumes` and `produces` become the default media types for request bodies and responses respectively. They can be overridden per-operation via the `@Consumes`/`@Produces` decorators.

```typescript
data: {
    consumes: ['application/json'],
    produces: ['application/json', 'application/xml'],
}
```

## Collection Format

`collectionFormat` controls how array-valued query parameters are serialised in OpenAPI 2.0. It has no effect on v3 emitters.

```typescript
data: { collectionFormat: 'multi' }  // ?tag=a&tag=b
```

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
