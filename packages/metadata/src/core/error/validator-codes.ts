/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ValidatorErrorCode = {
    EXPECTED_NUMBER: 'VALIDATOR_EXPECTED_NUMBER',
    EXPECTED_DATE: 'VALIDATOR_EXPECTED_DATE',
    EXPECTED_STRING: 'VALIDATOR_EXPECTED_STRING',
} as const;
export type ValidatorErrorCode = typeof ValidatorErrorCode[keyof typeof ValidatorErrorCode];
