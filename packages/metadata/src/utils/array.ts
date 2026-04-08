/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function isStringArray(input: unknown) : input is string[] {
    if (!Array.isArray(input)) {
        return false;
    }

    for (const element of input) {
        if (typeof element !== 'string') {
            return false;
        }
    }

    return true;
}
