# Caching

Parsing a TypeScript project from scratch is not free — the compiler has to load every source file, resolve types, and walk the AST. For large codebases, this can dominate build time. The metadata cache avoids re-parsing files that have not changed.

## Enabling the Cache

The simplest form accepts defaults:

```typescript
await generateMetadata({
    entryPoint: 'src/controllers/**/*.ts',
    preset: '@trapi/decorators',
    cache: true,
});
```

Default cache directory is `node_modules/.cache/@trapi/metadata`.

### Custom Directory

Either a string shorthand or the options object:

```typescript
cache: '.cache/trapi'
// or
cache: { directory: '.cache/trapi' }
```

### Full Options

```typescript
type CacheOptions = {
    directory: string;      // where cache files live
    clearAtRandom?: boolean; // occasionally prune stale entries
};
```

## How Invalidation Works

Each source file is hashed together with its mtime. On each run, TRAPI compares the recorded hash to the file currently on disk. Anything that differs is re-parsed; anything that matches is restored from cache.

Cache entries are also invalidated when any of the following change:

- the decorator configuration (preset name, `decorators` entries)
- the effective `tsconfig.json`
- the TRAPI version itself

This means you can safely leave the cache enabled in CI — a version bump or a config change will produce a clean build automatically.

## When to Disable It

- **Deterministic CI:** some teams prefer to always rebuild from scratch. Set `cache: false` (the default) or omit the option.
- **Debugging:** if you suspect cache corruption, clear the cache directory or disable the cache to rule it out.

## Clearing the Cache

Just delete the cache directory:

```bash
rm -rf node_modules/.cache/@trapi/metadata
```

There is no CLI for it — the cache is plain files.

## Interaction with Watch Mode

TRAPI has no built-in watcher. If your build tool drives watch mode, keeping `cache: true` makes every recompilation much faster. The cache is safe to share across tools as long as they agree on decorator configuration and tsconfig.

## Gotchas

- **Glob expansion is not cached.** The filesystem scan that expands `entryPoint` still runs every time — only per-file parsing is cached.
- **`tsconfig.json` edits invalidate everything.** A change to `compilerOptions` affects type resolution, so the cache is thrown out in full.
- **Cache files are not designed to be committed.** Treat the cache directory the same way you treat `node_modules/.cache`.
