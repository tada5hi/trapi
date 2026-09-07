# Changelog

## [3.2.0](https://github.com/tada5hi/trapi/compare/docs-v3.1.4...docs-v3.2.0) (2026-09-07)


### Features

* stable path operationIds, OpenAPI 3 content types, swagger.transform hook ([#902](https://github.com/tada5hi/trapi/issues/902)) ([8314456](https://github.com/tada5hi/trapi/commit/83144562af3bb1e7e526d91513014af2bb29ef12))


### Bug Fixes

* **swagger:** declare path-template variables that no parameter declared ([#903](https://github.com/tada5hi/trapi/issues/903)) ([0d349ff](https://github.com/tada5hi/trapi/commit/0d349ff60d83a4c3b898306226dc3f99c5962ae3)), closes [#896](https://github.com/tada5hi/trapi/issues/896)
* tsconfig extends resolution, v3 tag cascade, operationId propagation ([#899](https://github.com/tada5hi/trapi/issues/899)) ([3cc293b](https://github.com/tada5hi/trapi/commit/3cc293bf882fb663a916cae8d887dfeefeb9b28e)), closes [#895](https://github.com/tada5hi/trapi/issues/895)

## [3.1.4](https://github.com/tada5hi/trapi/compare/docs-v3.1.3...docs-v3.1.4) (2026-08-18)


### Bug Fixes

* **deps:** bump @types/node, nx and validup ([367b823](https://github.com/tada5hi/trapi/commit/367b8238d9254ec1855e8e530b1a3b081695324c))
* **deps:** bump the minorandpatch group across 1 directory with 4 updates ([#882](https://github.com/tada5hi/trapi/issues/882)) ([44755a6](https://github.com/tada5hi/trapi/commit/44755a61777ca9215d1776c0a58c1e212777e090))

## [3.1.3](https://github.com/tada5hi/trapi/compare/docs-v3.1.2...docs-v3.1.3) (2026-07-21)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 10 updates ([#863](https://github.com/tada5hi/trapi/issues/863)) ([1897fdc](https://github.com/tada5hi/trapi/commit/1897fdc26c3abfac2034bbebc924bcb7ae11322c))

## [3.1.2](https://github.com/tada5hi/trapi/compare/docs-v3.1.1...docs-v3.1.2) (2026-06-04)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 12 updates ([#849](https://github.com/tada5hi/trapi/issues/849)) ([4bfa470](https://github.com/tada5hi/trapi/commit/4bfa470e49cf5a581228326a31301df35ecaee64))

## [3.1.1](https://github.com/tada5hi/trapi/compare/docs-v3.1.0...docs-v3.1.1) (2026-05-08)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 2 updates ([#829](https://github.com/tada5hi/trapi/issues/829)) ([90faaa3](https://github.com/tada5hi/trapi/commit/90faaa343771f900586fa892a956bf7e1d35f1d8))

## [3.1.0](https://github.com/tada5hi/trapi/compare/docs-v3.0.0...docs-v3.1.0) (2026-05-07)


### Features

* **cli:** config file, subcommands, and styled output ([#827](https://github.com/tada5hi/trapi/issues/827)) ([4b9b595](https://github.com/tada5hi/trapi/commit/4b9b595179ccfa580ccdc41cbff6705cff9948c3))

## [3.0.0](https://github.com/tada5hi/trapi/compare/docs-v2.1.0...docs-v3.0.0) (2026-05-05)


### ⚠ BREAKING CHANGES

* **swagger:** generateSwagger no longer accepts MetadataGenerateOptions. Callers must invoke generateMetadata themselves and pass the result via options.metadata.
* **core:** `@trapi/metadata` no longer exports the framework-neutral domain types or decorator machinery. Import them from `@trapi/core` instead. Preset packages must declare `@trapi/core` as a `peerDependency` (not `@trapi/metadata`). Preset loading errors now throw `CoreError` (with codes from `CoreErrorCode`) rather than `MetadataError` / `ConfigError`.

### Features

* **core:** extract @trapi/core for framework-neutral types and decorator machinery ([#814](https://github.com/tada5hi/trapi/issues/814)) ([d37facf](https://github.com/tada5hi/trapi/commit/d37facfd040876cee16c58688047a2a2d8262751))
* **swagger:** decouple from @trapi/metadata, accept only pre-built Metadata ([#817](https://github.com/tada5hi/trapi/issues/817)) ([6bc5238](https://github.com/tada5hi/trapi/commit/6bc5238f55950797f8d78d3d41266fecf2bb0911))

## [2.1.0](https://github.com/tada5hi/trapi/compare/docs-v2.0.0...docs-v2.1.0) (2026-04-30)


### Features

* **metadata,swagger,presets:** preset-author helpers + controller deprecation ([#807](https://github.com/tada5hi/trapi/issues/807)) ([1002973](https://github.com/tada5hi/trapi/commit/1002973144f03ed3ab0d9823f8e74340e75f0ae4))

## [2.0.0](https://github.com/tada5hi/trapi/compare/docs-v1.0.0...docs-v2.0.0) (2026-04-30)


### ⚠ BREAKING CHANGES

* **presets:** multi path support
* **metadata,swagger,decorators:** multi path support

### Features

* **cli:** add @trapi/cli package with  command ([#800](https://github.com/tada5hi/trapi/issues/800)) ([adc0510](https://github.com/tada5hi/trapi/commit/adc05109b545efa7eb308774f73ee05ec82e47ec))
* drain decorator-v2 follow-ups (strict mode, namespace flatten, … ([#799](https://github.com/tada5hi/trapi/issues/799)) ([bd86d60](https://github.com/tada5hi/trapi/commit/bd86d6057cf63b9a9e991cdbee19bc787579f830))
* **metadata,swagger,decorators:** support multiple mount paths per c… ([#803](https://github.com/tada5hi/trapi/issues/803)) ([cd6546f](https://github.com/tada5hi/trapi/commit/cd6546fdf48044846fc5e8549c252d05fac7f840))
* **metadata,swagger:** add generateSwagger, saveSwagger, and unified… ([#786](https://github.com/tada5hi/trapi/issues/786)) ([15f6591](https://github.com/tada5hi/trapi/commit/15f65913aa0e5c150e3c88269ad6bc6585da57ce))
* **metadata,swagger:** add Validator.meta extension point for OpenAPI hints ([05bde31](https://github.com/tada5hi/trapi/commit/05bde31e24bdcaae7308bb2ad3220e587565b721))
* **metadata:** migrate type resolver to v2, delete v1, migrate presets ([#798](https://github.com/tada5hi/trapi/issues/798)) ([7c40649](https://github.com/tada5hi/trapi/commit/7c40649e13c685928bd80039be56ecb60842a931))


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 10 updates ([#792](https://github.com/tada5hi/trapi/issues/792)) ([2be45a9](https://github.com/tada5hi/trapi/commit/2be45a99c45c1e4208d1ed06a28fb2d4fec8b447))


### Code Refactoring

* **presets:** make framework presets self-contained ([#804](https://github.com/tada5hi/trapi/issues/804)) ([dc896b4](https://github.com/tada5hi/trapi/commit/dc896b4caefbba51bc6a3df24a2e709abd7946c9))

## 1.0.0 (2025-07-29)


### Bug Fixes

* **deps:** bump the minorandpatch group with 11 updates ([#708](https://github.com/tada5hi/trapi/issues/708)) ([b36cafc](https://github.com/tada5hi/trapi/commit/b36cafc88e8858d2441a7ac204d859419ec144ff))
