/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// Augmentation point: consumers (e.g. @trapi/swagger) extend this interface
// with their own keys via `declare module '@trapi/core'`. Stays empty
// here so the core layer remains framework-agnostic.

export interface ValidatorMeta {}

export type Validator = {
    value?: unknown,
    message?: string,
    meta?: ValidatorMeta,
};

export type Validators = Record<string, Validator>;
