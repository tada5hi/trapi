# Changelog

## [2.0.4](https://github.com/tada5hi/trapi/compare/cli-v2.0.3...cli-v2.0.4) (2026-07-31)


### Miscellaneous Chores

* **cli:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.3 to ^2.0.4
    * @trapi/swagger bumped from ^2.0.3 to ^2.0.4

## [2.0.3](https://github.com/tada5hi/trapi/compare/cli-v2.0.2...cli-v2.0.3) (2026-07-22)


### Bug Fixes

* **deps:** bump locter to v4.1.0 ([0604934](https://github.com/tada5hi/trapi/commit/06049348c1077ef69b0a9de059a25aba9f40be7c))
* **deps:** bump the minorandpatch group with 2 updates ([#868](https://github.com/tada5hi/trapi/issues/868)) ([df36e63](https://github.com/tada5hi/trapi/commit/df36e639c4f772401ca1370d2373baa2968ac945))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.2 to ^2.0.3
    * @trapi/swagger bumped from ^2.0.2 to ^2.0.3

## [2.0.2](https://github.com/tada5hi/trapi/compare/cli-v2.0.1...cli-v2.0.2) (2026-07-21)


### Bug Fixes

* **deps:** bump locter to v4 beta and migrate to the read/write API ([#861](https://github.com/tada5hi/trapi/issues/861)) ([e5c7021](https://github.com/tada5hi/trapi/commit/e5c7021e0a632143d50e9ce9ed4182b65709fbcb))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.1 to ^2.0.2
    * @trapi/swagger bumped from ^2.0.1 to ^2.0.2

## [2.0.1](https://github.com/tada5hi/trapi/compare/cli-v2.0.0...cli-v2.0.1) (2026-06-04)


### Bug Fixes

* **deps:** bump locter to v3 and remaining minor/patch updates ([9acd603](https://github.com/tada5hi/trapi/commit/9acd603dda3b24f3b94e1e563e878be26978d0aa))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.0 to ^2.0.1
    * @trapi/swagger bumped from ^2.0.0 to ^2.0.1

## [2.0.0](https://github.com/tada5hi/trapi/compare/cli-v0.1.2-beta.3...cli-v2.0.0) (2026-05-08)


### Miscellaneous Chores

* **cli:** Synchronize main versions


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.0-beta.4 to ^2.0.0
    * @trapi/swagger bumped from ^2.0.0-beta.4 to ^2.0.0

## [0.1.2-beta.3](https://github.com/tada5hi/trapi/compare/cli-v0.1.2-beta.2...cli-v0.1.2-beta.3) (2026-05-07)


### Features

* **cli:** config file, subcommands, and styled output ([#827](https://github.com/tada5hi/trapi/issues/827)) ([4b9b595](https://github.com/tada5hi/trapi/commit/4b9b595179ccfa580ccdc41cbff6705cff9948c3))

## [0.1.2-beta.2](https://github.com/tada5hi/trapi/compare/cli-v0.1.1-beta.2...cli-v0.1.2-beta.2) (2026-05-06)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.0-beta.3 to ^2.0.0-beta.4
    * @trapi/swagger bumped from ^2.0.0-beta.3 to ^2.0.0-beta.4

## [0.1.1-beta.2](https://github.com/tada5hi/trapi/compare/cli-v0.1.2-beta.0...cli-v0.1.1-beta.2) (2026-05-05)


### ⚠ BREAKING CHANGES

* **swagger:** generateSwagger no longer accepts MetadataGenerateOptions. Callers must invoke generateMetadata themselves and pass the result via options.metadata.

### Features

* **swagger:** decouple from @trapi/metadata, accept only pre-built Metadata ([#817](https://github.com/tada5hi/trapi/issues/817)) ([6bc5238](https://github.com/tada5hi/trapi/commit/6bc5238f55950797f8d78d3d41266fecf2bb0911))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @trapi/metadata bumped from ^2.0.0-beta.2 to ^2.0.0-beta.3
    * @trapi/swagger bumped from ^2.0.0-beta.2 to ^2.0.0-beta.3

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
