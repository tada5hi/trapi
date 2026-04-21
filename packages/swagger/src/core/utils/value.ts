/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function transformValueTo(
    type: 'string' | 'number' | 'integer' | 'boolean' | 'bigint',
    value: unknown,
): string | number | boolean | null {
    if (value === null) {
        return null;
    }

    switch (type) {
        case 'integer':
        case 'number':
            return Number(value);
        case 'boolean':
            return !!value;
        case 'string':
        default:
            return String(value);
    }
}
