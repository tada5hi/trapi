# @trapi/client

[![main](https://github.com/Tada5hi/typescript-rest-api/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/typescript-rest-api/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/typescript-rest-api/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/typescript-rest-api)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/typescript-rest-api/badge.svg)](https://snyk.io/test/github/Tada5hi/typescript-rest-api)
[![npm version](https://badge.fury.io/js/@trapi%2Fclient.svg)](https://badge.fury.io/js/@trapi%2Fclient)

This is a simple REST client based on axios.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Config](#config)
  - [Singleton](#singleton)
  - [Header](#header)

## Installation

```bash
npm install @trapi/client --save
```

## Usage

### Config

To create a configuration for the  `Client`, a configuration must be specified,
like described in the following:

**Client**

```typescript
import {
    setConfig
} from "@trapi/client";

setConfig({
    driver: {
        baseURL: 'http://localhost:3000/',
        withCredentials: true,
    },
}, 'key')
```

A configuration is always identified by a `key`,
so multiple configurations can be registered. The default key is named: `default`

In the upper example, the **driver** property is used to pass information to the underneath driver (axios).

### Singleton

A singleton instance associated for a given configuration key,
can be acquired like described in the following:

**Client**
```typescript
import {
    useClient
} from "@trapi/client";

const client = useClient('key');
client.setAuthorizationHeader({
    type: 'bearer',
    token: 'xxx'
})

(async () => {
    const {data} = await client.get('users');
    console.log(data);
    // [{id: 1, name: 'Peter'}]
})();
```

### Header

The main purpose of the header utils, is to parse and build HTTP headers.

**AuthorizationHeader**

```typescript
import {
    parseAuthorizationHeader,
    stringifyAuthorizationHeader
} from "@trapi/client";

const basicValue = Buffer
    .from('admin:start123')
    .toString('base64');

const value = parseAuthorizationHeader(`Basic ${basicValue}`);
console.log(value);
// {type: 'Basic', username: 'admin', password: 'start123'}

// -------------------------------------------------

let headerValue = stringifyAuthorizationHeader({
    type: 'Basic',
    username: 'admin',
    password: 'start123'
});
console.log(headerValue);
// Basic xxxxxxx

headerValue = stringifyAuthorizationHeader({
    type: 'Bearer',
    token: 'start123'
});
console.log(headerValue);
// Bearer start123
```
