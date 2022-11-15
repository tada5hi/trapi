# @trapi/decorators 📚

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fdecorators.svg)](https://badge.fury.io/js/@trapi%2Fdecorators)

Inspect the `CHANGELOG.md` in the repository for breaking changes.

**Table of Contents**

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

## Installation

```bash
npm install --save @trapi/decorators
```

## Configuration

```typescript
declare type Config = {
    /**
     * Use a pre-defined third party configuration in full scope or
     * only use a partial amount of defined type representations.
     *
     * Default: []
     */
    preset?: PresetConfig;
    /**
     * Use all internal defined representations or only use a subset.
     *
     * Default: true
     */
    internal?: MapperIDs;
    /**
     * Set up self defined aka. custom representations.
     */
    custom?: Partial<MapperIDRepresentation>;
}
```

## Usage

```typescript
import { Config, Mapper, NodeDecorator } from '@trapi/decorators';

const mapper = new Mapper({
    internal: true
});

const decorators : NodeDecorator[] = [
    { text: 'SwaggerTags', arguments: [['auth', 'admin']], typeArguments: [] },
    { text: 'SwaggerTags', arguments: [['auth'], ['admin']], typeArguments: [] },
    { text: 'SwaggerTags', arguments: [], typeArguments: [] },
];

let match = mapper.match('SWAGGER_TAGS', decorators);
let value = match.getPropertyValue('DEFAULT');
console.log(value);
// ['auth', 'admin']

match = mapper.match('RESPONSE_EXAMPLE', decorators);
console.log(match);
// undefined

```

## License

Made with 💚

Published under [MIT License](./LICENSE).
