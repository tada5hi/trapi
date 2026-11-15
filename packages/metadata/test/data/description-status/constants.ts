/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Declared apart from the controllers so the imported shapes reach the
// decorator argument through an import alias.

export const IMPORTED_CONFLICT = 409;

export enum HttpStatus {
    Created = 201,
}

export const STATUS = { ACCEPTED: 202 } as const;
