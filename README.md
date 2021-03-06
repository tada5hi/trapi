# TRAPI 🌌

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)

## What is it?
**T**ypeScript**R**est**API** is a small collection of few standalone as well helper libraries, to simplify the process of creating REST-APIs, generating documentations
and communicating between frontend and backend application.


**Table of Contents**

- [Installation](#installation)
- [Packages](#packages)

## Installation
Please follow the `README.md` instructions in the respective package folder.

## Packages
The repository contains the following packages:

### @trapi/client
[![npm version](https://badge.fury.io/js/@trapi%2Fclient.svg)](https://badge.fury.io/js/@trapi%2Fclient)

This package contains a simple API-Client based on axios.

[README.md](https://github.com/Tada5hi/trapi/tree/main/packages/client#README.md)

### @trapi/harbor-client
[![npm version](https://badge.fury.io/js/@trapi%2Fharbor-client.svg)](https://badge.fury.io/js/@trapi%2Fharbor-client)

This package contains an API-Client for the harbor image registry.

[README.md](https://github.com/Tada5hi/trapi/tree/main/packages/harbor-client#README.md)

### @trapi/metadata
[![npm version](https://badge.fury.io/js/@trapi%2Fmetadata.svg)](https://badge.fury.io/js/@trapi%2Fmetadata)

This package is responsible for generating metadata information by analyzing TypeScript REST decorators (self defined or third-party libraries). 
The metadata can than be used for generating a documentation according to the OpenAPI Specification or to create route schema/handling for libraries like: express, koa, etc.

[README.md](https://github.com/Tada5hi/trapi/tree/main/packages/metadata#README.md)

### @trapi/metadata-utils
[![npm version](https://badge.fury.io/js/@trapi%2Fmetadata-utils.svg)](https://badge.fury.io/js/@trapi%2Fmetadata-utils)

This Package contains all util functions, which are also partially required by other modules of this repository.

[README.md](https://github.com/Tada5hi/trapi/tree/main/packages/metadata-utils#README.md)

### @trapi/query
[![npm version](https://badge.fury.io/js/@trapi%2Fquery.svg)](https://badge.fury.io/js/@trapi%2Fquery)

This is a library for building `JSON:API` like REST-APIs.
It extends the specification format between request- & response-handling for querying and fetching data.

[README.md](https://github.com/Tada5hi/trapi/tree/main/packages/query#README.md)

### @trapi/swagger
[![npm version](https://badge.fury.io/js/@trapi%2Fswagger.svg)](https://badge.fury.io/js/@trapi%2Fswagger)

This package contains all functions, to generate a fully featured documentation according the OpenAPI Specification from given metadata.

[README.md](https://github.com/Tada5hi/trapi/tree/main/packages/swagger#README.md)

### @trapi/vault-client
[![npm version](https://badge.fury.io/js/@trapi%2Fvault-client.svg)](https://badge.fury.io/js/@trapi%2Fvault-client)

This package contains an API-Client for the vault secret storage.

[README.md](https://github.com/Tada5hi/trapi/tree/main/packages/vault-client#README.md)
