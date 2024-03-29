# TRAPI 🦜

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)

## What is it?
**T**ypeScript **R**est **API** is a collection of packages to create/generate:
- Metadata for REST-APIs
- Swagger documentation

**Table of Contents**

- [Packages](#packages)
- [Documentation](#documentation)
- [License](#license)

## Packages
The repository contains the following packages:

- **@trapi/metadata**: A package for generating metadata information by analyzing present decorators.
  The metadata can than be used for generating a documentation according to the OpenAPI Specification or to create route schema/handling for libraries like: express, koa, etc.
- **@trapi/swagger**: A package to generate a fully featured documentation according the OpenAPI Specification from given metadata.

## Documentation

To read the docs, visit [https://trapi.tada5hi.net](https://trapi.tada5hi.net)

## License

Made with 💚

Published under [MIT License](./LICENSE).
