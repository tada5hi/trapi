# What is it?

**T**ypeScript **R**est **API** is a collection of packages to create/generate:
- Metadata for REST-APIs
- Swagger documentation

::: warning **Important NOTE**

The guide is under construction ☂ at the moment. So please stay patient or contribute to it, till it covers all parts ⭐.
:::

## Packages

- **@trapi/decorator**: A package to map and manage (self or third-party defined) decorators and resolve (node-) types.
- **@trapi/metadata**: A package for generating metadata information by analyzing present decorators.
  The metadata can than be used for generating a documentation according to the OpenAPI Specification or to create route schema/handling for libraries like: express, koa, etc.
- **@trapi/swagger**: A package to generate a fully featured documentation according the OpenAPI Specification from given metadata.
