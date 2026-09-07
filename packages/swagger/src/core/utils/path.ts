/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function normalizePathParameters(str: string) : string {
    // <:id> -> {id}
    // todo: maybe escaping / is necessary
    str = str.replace(/<:([^/]+)>/g, '{$1}');

    // :id -> {id}
    str = str.replace(/:([^/]+)/g, '{$1}');

    // <id> -> {id}
    str = str.replace(/<([^/]+)>/g, '{$1}');

    return str;
}

/**
 * The `{name}` variables of an emitted path template, in order, deduplicated.
 * The path must already be normalized — `normalizePathParameters` guarantees that.
 */
export function pathVariables(path: string) : string[] {
    return [...new Set(
        path.matchAll(/\{([^{}/]+)\}/g).map((match) => match[1]!),
    )];
}

// OpenAPI 3.x §4.8.8 requires every `paths` key to start with `/`. Joining a
// controller path with a method path naively (template literal + slash
// stripping) collapses the root combination — `''` + `'/'`, `'/'` + `''`,
// `'/'` + `'/'` — to an empty string, which strict validators reject.
export function joinPaths(...segments: string[]): string {
    let result = segments.join('/').replace(/\/{2,}/g, '/');
    if (!result.startsWith('/')) {
        result = `/${result}`;
    }
    if (result.length > 1 && result.endsWith('/')) {
        result = result.slice(0, -1);
    }
    return result;
}
