/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function removeDuplicateSlashes(str: string) : string {
    return str.replace('/([^:]$)/+/g', '$1');
}

export function removeFinalCharacter(
    str: string,
    character: string,
) {
    while (str.charAt(str.length - 1) === character && str.length > 0) {
        str = str.slice(0, -1);
    }

    return str;
}
