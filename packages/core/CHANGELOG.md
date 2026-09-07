# Changelog

## [2.1.1](https://github.com/tada5hi/trapi/compare/core-v2.1.0...core-v2.1.1) (2026-09-07)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 13 updates ([#905](https://github.com/tada5hi/trapi/issues/905)) ([a4e4c06](https://github.com/tada5hi/trapi/commit/a4e4c066f72e128c5646aad1f28837b82e488fca))

## [2.1.0](https://github.com/tada5hi/trapi/compare/core-v2.0.5...core-v2.1.0) (2026-09-07)


### Bug Fixes

* tsconfig extends resolution, v3 tag cascade, operationId propagation ([#899](https://github.com/tada5hi/trapi/issues/899)) ([3cc293b](https://github.com/tada5hi/trapi/commit/3cc293bf882fb663a916cae8d887dfeefeb9b28e)), closes [#895](https://github.com/tada5hi/trapi/issues/895)

## [2.0.5](https://github.com/tada5hi/trapi/compare/core-v2.0.4...core-v2.0.5) (2026-08-18)


### Bug Fixes

* **deps:** bump @types/node, nx and validup ([367b823](https://github.com/tada5hi/trapi/commit/367b8238d9254ec1855e8e530b1a3b081695324c))

## [2.0.4](https://github.com/tada5hi/trapi/compare/core-v2.0.3...core-v2.0.4) (2026-07-31)


### Bug Fixes

* **deps:** bump validup to v1 and migrate to @validup/zod ([a63582b](https://github.com/tada5hi/trapi/commit/a63582bc9bc5bf9aec00c0ab4b9cfc93e32dd67c))

## [2.0.3](https://github.com/tada5hi/trapi/compare/core-v2.0.2...core-v2.0.3) (2026-07-22)


### Bug Fixes

* **deps:** bump locter to v4.1.0 ([0604934](https://github.com/tada5hi/trapi/commit/06049348c1077ef69b0a9de059a25aba9f40be7c))
* **deps:** bump the minorandpatch group with 2 updates ([#868](https://github.com/tada5hi/trapi/issues/868)) ([df36e63](https://github.com/tada5hi/trapi/commit/df36e639c4f772401ca1370d2373baa2968ac945))

## [2.0.2](https://github.com/tada5hi/trapi/compare/core-v2.0.1...core-v2.0.2) (2026-07-21)


### Bug Fixes

* **deps:** bump locter to v4 beta and migrate to the read/write API ([#861](https://github.com/tada5hi/trapi/issues/861)) ([e5c7021](https://github.com/tada5hi/trapi/commit/e5c7021e0a632143d50e9ce9ed4182b65709fbcb))
* **deps:** bump the minorandpatch group across 1 directory with 10 updates ([#863](https://github.com/tada5hi/trapi/issues/863)) ([1897fdc](https://github.com/tada5hi/trapi/commit/1897fdc26c3abfac2034bbebc924bcb7ae11322c))

## [2.0.1](https://github.com/tada5hi/trapi/compare/core-v2.0.0...core-v2.0.1) (2026-06-04)


### Bug Fixes

* **deps:** bump locter to v3 and remaining minor/patch updates ([9acd603](https://github.com/tada5hi/trapi/commit/9acd603dda3b24f3b94e1e563e878be26978d0aa))
* **deps:** bump the minorandpatch group across 1 directory with 12 updates ([#849](https://github.com/tada5hi/trapi/issues/849)) ([4bfa470](https://github.com/tada5hi/trapi/commit/4bfa470e49cf5a581228326a31301df35ecaee64))
* **deps:** bump the minorandpatch group across 1 directory with 5 updates ([#838](https://github.com/tada5hi/trapi/issues/838)) ([5721721](https://github.com/tada5hi/trapi/commit/57217210eca89b00e868773b42ca6fa28ece0e9b))

## [2.0.0](https://github.com/tada5hi/trapi/compare/core-v2.0.0-beta.4...core-v2.0.0) (2026-05-08)


### Miscellaneous Chores

* **core:** Synchronize main versions

## [2.0.0-beta.4](https://github.com/tada5hi/trapi/compare/core-v2.0.0-beta.3...core-v2.0.0-beta.4) (2026-05-06)


### Bug Fixes

* **deps:** bump the minorandpatch group across 1 directory with 3 updates ([#820](https://github.com/tada5hi/trapi/issues/820)) ([35b9e59](https://github.com/tada5hi/trapi/commit/35b9e594ef3e48e5c22df350c184ca41862390e2))

## 2.0.0-beta.3 (2026-05-05)


### ⚠ BREAKING CHANGES

* **swagger:** generateSwagger no longer accepts MetadataGenerateOptions. Callers must invoke generateMetadata themselves and pass the result via options.metadata.
* **core:** `@trapi/metadata` no longer exports the framework-neutral domain types or decorator machinery. Import them from `@trapi/core` instead. Preset packages must declare `@trapi/core` as a `peerDependency` (not `@trapi/metadata`). Preset loading errors now throw `CoreError` (with codes from `CoreErrorCode`) rather than `MetadataError` / `ConfigError`.

### Features

* **core:** extract @trapi/core for framework-neutral types and decorator machinery ([#814](https://github.com/tada5hi/trapi/issues/814)) ([d37facf](https://github.com/tada5hi/trapi/commit/d37facfd040876cee16c58688047a2a2d8262751))
* **swagger:** decouple from @trapi/metadata, accept only pre-built Metadata ([#817](https://github.com/tada5hi/trapi/issues/817)) ([6bc5238](https://github.com/tada5hi/trapi/commit/6bc5238f55950797f8d78d3d41266fecf2bb0911))
