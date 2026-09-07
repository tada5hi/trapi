/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function uniqueOperationId(base: string, used: Set<string>): string {
    if (!used.has(base)) {
        used.add(base);
        return base;
    }
    let counter = 2;
    while (used.has(`${base}_${counter}`)) {
        counter += 1;
    }
    const candidate = `${base}_${counter}`;
    used.add(candidate);
    return candidate;
}

function ucfirst(input: string): string {
    return input.charAt(0).toUpperCase() + input.substring(1);
}

/**
 * Non-alphanumerics are separators, not characters: `by-id` -> `ById`,
 * `user.profile` -> `UserProfile`. operationIds are consumed by client
 * generators as method names, so the output must be identifier-safe.
 */
function segmentToName(segment: string): string {
    return segment.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(ucfirst).join('');
}

/**
 * Derive an operationId from the HTTP verb and the emitted URL template, e.g.
 * `get` + `/realms/{realmId}/roles` -> `getRealmsByRealmIdRoles`.
 *
 * The path must already be normalized (leading `/`, no `//`, `{name}` params) —
 * `joinPaths` + `normalizePathParameters` guarantee that.
 */
export function operationIdFromPath(verb: string, path: string): string {
    // `verb` is lowercase per MethodType, but Metadata can come from any
    // extractor (generateSwagger accepts a hand-built Metadata), so normalise.
    // The lowercase verb prefix also keeps the id identifier-safe when the first
    // path segment starts with a digit (`/2fa` -> `get2fa`).
    let output = verb.toLowerCase();

    for (const segment of path.split('/')) {
        if (!segment) {
            continue;
        }

        const parameter = /^\{(.*)\}$/.exec(segment);
        output += parameter ? `By${segmentToName(parameter[1]!)}` : segmentToName(segment);
    }

    // ponytail: no verb aliasing (post -> create) and no `Root` suffix for `/`.
    // `GET /` yields `get`, which is unique by construction (one verb per path).
    // Upgrade path: a third OperationIdStrategy value, additive.
    return output;
}
