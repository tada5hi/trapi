# Testing

## Setup

- **Framework**: Jest 30
- **Transform**: SWC (`@swc/jest`) for fast TypeScript compilation
- **Pattern**: `*.spec.ts` and `*.test.ts` files in `test/unit/` directories

## Running Tests

```bash
# All packages
npx nx run-many -t test

# Single package
npx nx run @trapi/metadata:test
npx nx run @trapi/swagger:test

# With coverage
npx nx run @trapi/metadata:test:coverage
```

## Coverage Thresholds

The `@trapi/metadata` package enforces coverage minimums:

| Metric     | Threshold |
|------------|-----------|
| Branches   | 58%       |
| Functions  | 77%       |
| Lines      | 73%       |
| Statements | 73%       |

Coverage excludes: `.d.ts` files, decorator mapper functions, resolver TS-specific functions, validator utilities.

## Test Structure

Tests are organized by module:

```
packages/metadata/test/
├── unit/
│   ├── cache/
│   ├── decorator/
│   ├── generator/
│   ├── resolver/
│   └── utils/
└── data/         # Test fixtures (controller files with decorators)

packages/swagger/test/
├── unit/
│   └── spec/     # Endpoint specification tests
└── data/         # Test fixtures
```

## Test Patterns

- **Metadata tests** use fixture controller files in `test/data/` decorated with TRAPI decorators, then verify the extracted metadata structure.
- **Swagger tests** verify generated OpenAPI specs against expected output for various endpoint patterns (primitives, abstract entities, unions, v3-specific features).
- Tests that need the TypeScript compiler create a program from fixture files and pass it to the generators.
