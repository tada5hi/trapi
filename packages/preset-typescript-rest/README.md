# @trapi/preset-typescript-rest 🧩

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![npm version](https://badge.fury.io/js/@trapi%2Fpreset-typescript-rest.svg)](https://badge.fury.io/js/@trapi%2Fpreset-typescript-rest)

TRAPI decorator preset for the [typescript-rest](https://www.npmjs.com/package/typescript-rest) library.

It maps the typescript-rest decorator vocabulary (`@Path`, `@GET`, `@POST`, `@QueryParam`, `@PathParam`,
the `ContextRequest` family, …) to TRAPI metadata handlers — including typescript-rest's own
`@Description`/`@Example`/`@Security` shapes — and additionally ships the TRAPI marker decorators
(`@Hidden`, `@Tags`, `@Extension`, `@Produces`, `@Consumes`, `@Deprecated`,
`@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble`) as well as the matching JSDoc tag handlers.

Inspect the `CHANGELOG.md` in the repository for breaking changes.

## Installation

```bash
npm install @trapi/preset-typescript-rest --save-dev
```

## Usage

Reference the preset by name when generating metadata:

```typescript
import { generateMetadata } from '@trapi/metadata';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-typescript-rest',
});
```

## Documentation

To read the docs, visit [https://trapi.tada5hi.net](https://trapi.tada5hi.net).

## License

Made with 💚

Published under [MIT License](./LICENSE).
