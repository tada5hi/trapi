# Caching

Parsing a TypeScript project from scratch is not free — the compiler has to load every source file, resolve types, and walk the AST. For large codebases, this can dominate build time. The metadata cache persists the previous extraction result so subsequent runs can skip straight to the output.

## Enabling the Cache

The simplest form is a boolean:

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/preset-decorators-express',
    cache: true,
});
```

### Custom Directory

A string value is treated as the directory path:

```typescript
cache: '.cache/trapi'
// expands to: { enabled: true, directoryPath: '.cache/trapi' }
```

Relative paths resolve against `process.cwd()`; absolute paths are used as-is.

### Full Options

```typescript
interface CacheOptions {
    enabled: boolean;
    directoryPath: string;    // default: os.tmpdir()
    fileName?: string;        // default: metadata-{hash}.json
    clearAtRandom: boolean;   // default: true (false when NODE_ENV === 'test')
}
```

Pass any subset:

```typescript
cache: {
    enabled: true,
    directoryPath: '.cache/trapi',
    fileName: 'my-api.json',
}
```

## How Invalidation Works

The cache key is derived from the total byte size of all non-ignored source files loaded from your TypeScript program. Each source file contributes its end-position (roughly its character count) to the running total, and the sum is hashed to pick a cache file:

1. TRAPI loads source files through the TypeScript compiler and sums their sizes.
2. It looks for a cache file under `directoryPath` recorded with the same hash.
3. **Hit** → the cached `Metadata` is returned and AST analysis is skipped entirely.
4. **Miss** → a full extraction runs and the result is written back for next time.

Because the key is a sum, most meaningful edits change the total and invalidate the cache: adding or removing lines, renaming identifiers to a different length, adding new files. The edge case to be aware of is **same-length edits** — e.g. replacing `foo` with `bar` in one file without any other change keeps the sum identical, so the cache can serve stale metadata. When in doubt, `cache: false` or a manual directory wipe forces a full rebuild.

### clearAtRandom

On every successful run, TRAPI has a ~10% chance of pruning stale cache files in the directory. This prevents long-lived caches from accumulating junk without manual cleanup. In test environments (`NODE_ENV === 'test'`) it defaults to `false` so test runs are deterministic.

## When to Disable It

- **Same-length content edits you don't trust to invalidate**: pass `cache: false` or wipe the cache directory.
- **Deterministic CI builds**: prefer `cache: false` (the default) if you want a full extraction every time.
- **Debugging resolver output**: removing the cache rules out stale data as a suspect.

## Clearing the Cache

Delete the cache directory, or the specific file:

```bash
# If cache lives in the default tmp location
rm -rf "$(node -e 'console.log(require("os").tmpdir())')"/metadata-*.json

# Or a project-local directory you set via directoryPath
rm -rf .cache/trapi
```

There is no CLI for it — the cache is plain JSON files.

## Interaction with Watch Mode

TRAPI has no built-in watcher. If your build tool drives watch mode, the cache invalidates whenever the total source byte size changes, which covers nearly all real edits. For absolute correctness during rapid iteration, disable the cache or rely on your build tool to clear `directoryPath` between runs.

## Gotchas

- **Same-length edits can miss.** The cache key is a sum of file sizes, not a per-file hash. An edit that preserves total bytes will not invalidate — rare in practice but possible (e.g. swapping two identifiers of equal length).
- **Default directory is `os.tmpdir()`.** Ephemeral on many OSes — perfect for local reuse, unreliable for CI artefacts. Set `directoryPath` to a project-local path if you want persistence.
- **Cache files are not designed to be committed.** Treat `directoryPath` the same way you treat `node_modules/.cache`.
