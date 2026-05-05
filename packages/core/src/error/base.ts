/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BaseError, isBaseError } from '@ebec/core';

export class CoreError extends BaseError {

}

export function isCoreError(input: unknown): input is CoreError & { code?: string } {
    return isBaseError(input) && input instanceof CoreError;
}
