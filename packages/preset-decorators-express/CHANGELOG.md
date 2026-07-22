# Changelog

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.0.0-alpha.9 to ^1.0.0
  * devDependencies
    * @trapi/metadata bumped from ^1.0.0-alpha.8 to ^1.0.0
  * peerDependencies
    * @trapi/metadata bumped from 1.x || >=1.0.0-alpha.0 to 1.0.0

## Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.0.0 to ^1.0.1
  * devDependencies
    * @trapi/metadata bumped from ^1.0.0 to ^1.0.1
  * peerDependencies
    * @trapi/metadata bumped from 1.0.0 to 1.0.1

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.0.1 to ^1.1.0
  * devDependencies
    * @trapi/metadata bumped from ^1.0.1 to ^1.1.0
  * peerDependencies
    * @trapi/metadata bumped from 1.0.1 to 1.1.0

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.1.0 to ^1.2.0
  * devDependencies
    * @trapi/metadata bumped from ^1.1.0 to ^1.2.0
  * peerDependencies
    * @trapi/metadata bumped from 1.1.0 to 1.2.0

### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.2.0 to ^1.2.1
  * devDependencies
    * @trapi/metadata bumped from ^1.2.0 to ^1.2.1
  * peerDependencies
    * @trapi/metadata bumped from 1.2.0 to 1.2.1

## [0.2.5](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.4...preset-decorators-express-v0.2.5) (2026-07-22)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/core bumped from 2.0.2 to 2.0.3
  * peerDependencies
    * @trapi/core bumped from 2.0.2 to 2.0.3

## [0.2.4](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.3-beta.3...preset-decorators-express-v0.2.4) (2026-07-21)


### Miscellaneous Chores

* **preset-decorators-express:** add package readme ([d9b36a9](https://github.com/tada5hi/trapi/commit/d9b36a9915a7b53ab3464a99a6cab174a9406c4d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/core bumped from 2.0.1 to 2.0.2
  * peerDependencies
    * @trapi/core bumped from 2.0.1 to 2.0.2

## [0.2.3-beta.3](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.2-beta.3...preset-decorators-express-v0.2.3-beta.3) (2026-06-04)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/core bumped from 2.0.0 to 2.0.1
  * peerDependencies
    * @trapi/core bumped from 2.0.0 to 2.0.1

## [0.2.2-beta.3](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.1-beta.3...preset-decorators-express-v0.2.2-beta.3) (2026-05-08)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/core bumped from 2.0.0-beta.4 to 2.0.0
  * peerDependencies
    * @trapi/core bumped from 2.0.0-beta.4 to 2.0.0

## [0.2.1-beta.3](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.0-beta.3...preset-decorators-express-v0.2.1-beta.3) (2026-05-06)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/core bumped from 2.0.0-beta.3 to 2.0.0-beta.4
  * peerDependencies
    * @trapi/core bumped from 2.0.0-beta.3 to 2.0.0-beta.4

## [0.2.0-beta.3](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.1-beta.1...preset-decorators-express-v0.2.0-beta.3) (2026-05-05)


### ⚠ BREAKING CHANGES

* **core:** `@trapi/metadata` no longer exports the framework-neutral domain types or decorator machinery. Import them from `@trapi/core` instead. Preset packages must declare `@trapi/core` as a `peerDependency` (not `@trapi/metadata`). Preset loading errors now throw `CoreError` (with codes from `CoreErrorCode`) rather than `MetadataError` / `ConfigError`.

### Features

* **core:** extract @trapi/core for framework-neutral types and decorator machinery ([#814](https://github.com/tada5hi/trapi/issues/814)) ([d37facf](https://github.com/tada5hi/trapi/commit/d37facfd040876cee16c58688047a2a2d8262751))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/core bumped from 0.0.0 to 2.0.0-beta.3
  * peerDependencies
    * @trapi/core bumped from 0.0.0 to 2.0.0-beta.3

## [0.2.1-beta.1](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.0-beta.1...preset-decorators-express-v0.2.1-beta.1) (2026-05-04)


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/metadata bumped from ^2.0.0-beta.1 to ^2.0.0-beta.2
  * peerDependencies
    * @trapi/metadata bumped from 2.0.0-beta.1 to 2.0.0-beta.2

## [0.2.0-beta.1](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.2.0-beta.0...preset-decorators-express-v0.2.0-beta.1) (2026-04-30)


### Features

* **metadata,swagger,presets:** preset-author helpers + controller deprecation ([#807](https://github.com/tada5hi/trapi/issues/807)) ([1002973](https://github.com/tada5hi/trapi/commit/1002973144f03ed3ab0d9823f8e74340e75f0ae4))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/metadata bumped from ^2.0.0-beta.0 to ^2.0.0-beta.1
  * peerDependencies
    * @trapi/metadata bumped from 2.0.0-beta.0 to 2.0.0-beta.1

## [0.2.0-beta.0](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.1.8...preset-decorators-express-v0.2.0-beta.0) (2026-04-30)


### ⚠ BREAKING CHANGES

* **presets:** multi path support
* all packages now output ESM only (.mjs)

### Features

* **metadata,swagger:** add generateSwagger, saveSwagger, and unified… ([#786](https://github.com/tada5hi/trapi/issues/786)) ([15f6591](https://github.com/tada5hi/trapi/commit/15f65913aa0e5c150e3c88269ad6bc6585da57ce))
* **metadata:** migrate type resolver to v2, delete v1, migrate presets ([#798](https://github.com/tada5hi/trapi/issues/798)) ([7c40649](https://github.com/tada5hi/trapi/commit/7c40649e13c685928bd80039be56ecb60842a931))


### Code Refactoring

* **presets:** make framework presets self-contained ([#804](https://github.com/tada5hi/trapi/issues/804)) ([dc896b4](https://github.com/tada5hi/trapi/commit/dc896b4caefbba51bc6a3df24a2e709abd7946c9))


### Build System

* modernize tooling to ESM, tsdown, vitest, and eslint v10 ([24e1f58](https://github.com/tada5hi/trapi/commit/24e1f587cfd66890b91f58f78d3b6434f12f577d))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * @trapi/metadata bumped from ^1.3.0 to ^2.0.0-beta.0
  * peerDependencies
    * @trapi/metadata bumped from 1.3.0 to 2.0.0-beta.0

## [0.1.8](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.1.7...preset-decorators-express-v0.1.8) (2025-07-29)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.2.3 to ^1.3.0
  * devDependencies
    * @trapi/metadata bumped from ^1.2.3 to ^1.3.0
  * peerDependencies
    * @trapi/metadata bumped from 1.2.3 to 1.3.0

## [0.1.7](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.1.6...preset-decorators-express-v0.1.7) (2024-06-24)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.2.2 to ^1.2.3
  * devDependencies
    * @trapi/metadata bumped from ^1.2.2 to ^1.2.3
  * peerDependencies
    * @trapi/metadata bumped from 1.2.2 to 1.2.3

## [0.1.6](https://github.com/tada5hi/trapi/compare/preset-decorators-express-v0.1.5...preset-decorators-express-v0.1.6) (2024-04-03)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/decorators bumped from ^1.2.1 to ^1.2.2
  * devDependencies
    * @trapi/metadata bumped from ^1.2.1 to ^1.2.2
  * peerDependencies
    * @trapi/metadata bumped from 1.2.1 to 1.2.2

## [0.1.0-alpha.9](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.8...@trapi/preset-decorators-express@0.1.0-alpha.9) (2023-03-17)

**Note:** Version bump only for package @trapi/preset-decorators-express





## [0.1.0-alpha.8](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.7...@trapi/preset-decorators-express@0.1.0-alpha.8) (2023-03-15)

**Note:** Version bump only for package @trapi/preset-decorators-express





## [0.1.0-alpha.7](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.6...@trapi/preset-decorators-express@0.1.0-alpha.7) (2023-03-13)

**Note:** Version bump only for package @trapi/preset-decorators-express





## [0.1.0-alpha.6](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.5...@trapi/preset-decorators-express@0.1.0-alpha.6) (2023-03-12)

**Note:** Version bump only for package @trapi/preset-decorators-express





## [0.1.0-alpha.5](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.4...@trapi/preset-decorators-express@0.1.0-alpha.5) (2023-03-12)

**Note:** Version bump only for package @trapi/preset-decorators-express





## [0.1.0-alpha.4](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.3...@trapi/preset-decorators-express@0.1.0-alpha.4) (2023-03-11)

**Note:** Version bump only for package @trapi/preset-decorators-express





## [0.1.0-alpha.3](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.2...@trapi/preset-decorators-express@0.1.0-alpha.3) (2023-03-11)


### Bug Fixes

* better naming for decorator-ids & param decorator names ([6875f53](https://github.com/Tada5hi/trapi/commit/6875f53d7f5a2379ef19933626e46885ce3fcadc))


### Features

* create decorators package + moved test data ([868d10a](https://github.com/Tada5hi/trapi/commit/868d10abfa7895bedba352d871254a8f98f47776))


### Performance Improvements

* enhanced controller & method generation ([3c023b4](https://github.com/Tada5hi/trapi/commit/3c023b4525559a9dff34c6113ba33d6f4c9b0986))





## [0.1.0-alpha.2](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.1...@trapi/preset-decorators-express@0.1.0-alpha.2) (2023-03-06)


### Features

* enhance ts node js-doc interaction/usage ([9c3ddc3](https://github.com/Tada5hi/trapi/commit/9c3ddc372b0e73e2ecdc035912dabacc1076541a))





## [0.1.0-alpha.1](https://github.com/Tada5hi/trapi/compare/@trapi/preset-decorators-express@0.1.0-alpha.0...@trapi/preset-decorators-express@0.1.0-alpha.1) (2023-03-06)

**Note:** Version bump only for package @trapi/preset-decorators-express





## 0.1.0-alpha.0 (2023-03-06)


### Features

* initial preset decorators-express release ([9a0ee94](https://github.com/Tada5hi/trapi/commit/9a0ee9426b701cb56eddca11896bcedb2f4ce631))
