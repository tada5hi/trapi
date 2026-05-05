# Changelog

## [0.1.1-beta.1](https://github.com/tada5hi/trapi/compare/cli-v0.1.2-beta.0...cli-v0.1.1-beta.1) (2026-05-05)


### ⚠ BREAKING CHANGES

* **swagger:** generateSwagger no longer accepts MetadataGenerateOptions. Callers must invoke generateMetadata themselves and pass the result via options.metadata.

### Features

* **swagger:** decouple from @trapi/metadata, accept only pre-built Metadata ([#817](https://github.com/tada5hi/trapi/issues/817)) ([6bc5238](https://github.com/tada5hi/trapi/commit/6bc5238f55950797f8d78d3d41266fecf2bb0911))

## [0.1.2-beta.0](https://github.com/tada5hi/trapi/compare/cli-v0.1.1-beta.0...cli-v0.1.2-beta.0) (2026-05-04)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.0-beta.1 to ^2.0.0-beta.2
    * @trapi/swagger bumped from ^2.0.0-beta.1 to ^2.0.0-beta.2

## [0.1.1-beta.0](https://github.com/tada5hi/trapi/compare/cli-v0.1.0-beta.0...cli-v0.1.1-beta.0) (2026-04-30)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.0-beta.0 to ^2.0.0-beta.1
    * @trapi/swagger bumped from ^2.0.0-beta.0 to ^2.0.0-beta.1

## 0.1.0-beta.0 (2026-04-30)


### ⚠ BREAKING CHANGES

* **presets:** multi path support

### Features

* **cli:** add @trapi/cli package with  command ([#800](https://github.com/tada5hi/trapi/issues/800)) ([adc0510](https://github.com/tada5hi/trapi/commit/adc05109b545efa7eb308774f73ee05ec82e47ec))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 4 updates ([#802](https://github.com/tada5hi/trapi/issues/802)) ([e8466da](https://github.com/tada5hi/trapi/commit/e8466da4e9f4a56733d26462ca43527ccbe2e653))


### Code Refactoring

* **presets:** make framework presets self-contained ([#804](https://github.com/tada5hi/trapi/issues/804)) ([dc896b4](https://github.com/tada5hi/trapi/commit/dc896b4caefbba51bc6a3df24a2e709abd7946c9))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^1.3.0 to ^2.0.0-beta.0
    * @trapi/swagger bumped from ^1.3.0 to ^2.0.0-beta.0
