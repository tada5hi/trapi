/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ParameterErrorCode = {
    TYPE_UNSUPPORTED: 'PARAMETER_TYPE_UNSUPPORTED',
    METHOD_UNSUPPORTED: 'PARAMETER_METHOD_UNSUPPORTED',
    PATH_MISMATCH: 'PARAMETER_PATH_MISMATCH',
    SCOPE_REQUIRED: 'PARAMETER_SCOPE_REQUIRED',
    INVALID_EXAMPLE: 'PARAMETER_INVALID_EXAMPLE',
} as const;
export type ParameterErrorCode = typeof ParameterErrorCode[keyof typeof ParameterErrorCode];
