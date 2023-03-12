/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum ValidatorName {
    UNIQUE_ITEMS = 'uniqueItems',

    MINIMUM = 'minimum',
    MAXIMUM = 'maximum',
    MIN_ITEMS = 'minItems',
    MAX_ITEMS = 'maxItems',
    MIN_LENGTH = 'minLength',
    MAX_LENGTH = 'maxLength',

    MIN_DATE = 'minDate',
    MAX_DATE = 'maxDate',

    PATTERN = 'pattern',
}
