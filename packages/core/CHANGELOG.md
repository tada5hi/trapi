# Changelog

## 2.0.0-beta.3 (2026-05-05)


### ⚠ BREAKING CHANGES

* **swagger:** generateSwagger no longer accepts MetadataGenerateOptions. Callers must invoke generateMetadata themselves and pass the result via options.metadata.
* **core:** `@trapi/metadata` no longer exports the framework-neutral domain types or decorator machinery. Import them from `@trapi/core` instead. Preset packages must declare `@trapi/core` as a `peerDependency` (not `@trapi/metadata`). Preset loading errors now throw `CoreError` (with codes from `CoreErrorCode`) rather than `MetadataError` / `ConfigError`.

### Features

* **core:** extract @trapi/core for framework-neutral types and decorator machinery ([#814](https://github.com/tada5hi/trapi/issues/814)) ([d37facf](https://github.com/tada5hi/trapi/commit/d37facfd040876cee16c58688047a2a2d8262751))
* **swagger:** decouple from @trapi/metadata, accept only pre-built Metadata ([#817](https://github.com/tada5hi/trapi/issues/817)) ([6bc5238](https://github.com/tada5hi/trapi/commit/6bc5238f55950797f8d78d3d41266fecf2bb0911))
