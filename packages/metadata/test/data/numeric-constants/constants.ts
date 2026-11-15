/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Declared apart from `usage.ts` so the imported shapes reach the decorator
// argument through an import alias.

export const IMPORTED_CONFLICT = 409;

export enum HttpStatus {
    Conflict = 409,
}

export const STATUS = { CONFLICT: 409 } as const;
