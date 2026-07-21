# @trapi/preset-decorators-express 🧩

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![npm version](https://badge.fury.io/js/@trapi%2Fpreset-decorators-express.svg)](https://badge.fury.io/js/@trapi%2Fpreset-decorators-express)

TRAPI decorator preset for the [@decorators/express](https://www.npmjs.com/package/@decorators/express) library.

It maps the `@decorators/express` decorator vocabulary (`@Controller`, `@Get`, `@Post`, `@Body`, `@Params`, `@Query`, …)
to TRAPI metadata handlers and additionally ships the TRAPI marker decorators
(`@Hidden`, `@Tags`, `@Description`, `@Example`, `@Extension`, `@Security`, `@Produces`, `@Consumes`,
`@Deprecated`, `@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble`) as well as the matching JSDoc tag handlers.

Inspect the `CHANGELOG.md` in the repository for breaking changes.

## Installation

```bash
npm install @trapi/preset-decorators-express --save-dev
```

## Usage

Reference the preset by name when generating metadata:

```typescript
import { generateMetadata } from '@trapi/metadata';

const metadata = await generateMetadata({
    entryPoint: ['src/controllers/**/*.ts'],
    preset: '@trapi/preset-decorators-express',
});
```

## Documentation

To read the docs, visit [https://trapi.tada5hi.net](https://trapi.tada5hi.net).

## License

Made with 💚

Published under [MIT License](./LICENSE).
