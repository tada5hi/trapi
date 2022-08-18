# @trapi/decorator 📚

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fdecorator.svg)](https://badge.fury.io/js/@trapi%2Fdecorator)

Inspect the `CHANGELOG.md` in the repository for breaking changes.

**Table of Contents**

- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)

## Installation

```bash
npm install --save @trapi/decorator
```

## Configuration

The configuration is relative complex and is not described in detail here yet.
Please read the `source code` and the according `tests` for better understanding.

- Tests: 
  - `test/unit/decorator/mapper/index.spec.ts`
  - `test/unit/decorator/representation/index.spec.ts`
- Code: 
  - `src/decorator/**/*.ts`

If you are the author (or contributor) of a TypeScript Decorator API library and need help to set things up, feel free to open an Issue and ask for help.
```typescript
export interface Config {
    /**
     * Use a pre defined third party TypeRepresentationMap in full scope or
     * only use a partial amount of defined type representations.
     *
     * Default: []
     */
    library?: ConfigLibrary;
    /**
     * Use all internal defined type representations or only use a subset.
     * Default: true
     */
    internal?: TypeRepresentationConfig;
    /**
     * Set up self defined type representations.
     */
    map?: Partial<TypeRepresentationMap>;
}
```

## Usage
