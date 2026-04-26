# Custom Preset — Worked Example

A self-contained reference for authoring a TRAPI v2 `Preset` against a custom
decorator library that uses different naming conventions than `@trapi/decorators`.

## Structure

| Path | Role |
| --- | --- |
| `src/decorators.ts` | Runtime decorator stubs (`@Route`, `@HttpGet`, `@FromBody`, ...). In a real project this would be your existing decorator library. |
| `src/preset.ts` | The v2 `Preset` mapping each decorator to a draft mutation. |
| `fixtures/sample.ts` | A controller using the decorators. |
| `test/preset.spec.ts` | Runs `generateMetadata` and asserts the extracted shape. |

## Run

```bash
npm install
npx nx run @trapi/example-custom-preset:test
```

## What to copy

When migrating from a different decorator library to TRAPI:

1. Start from `src/preset.ts` — replace the handler `match.name` strings with
   your own decorator names.
2. Use `marker: MarkerName.Hidden` (and the other marker values) on handlers
   whose decorators participate in resolver-side concerns (`@Hidden`,
   `@Deprecated`, `@Extension`, `@IsInt`/`@IsLong`/`@IsFloat`/`@IsDouble`).
3. Save `preset.ts` either alongside your code (resolved by relative path) or
   as a published npm package (resolved by package name).
