/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function buildProjectNameFromRepositoryName(name: string) {
    const parts: string[] = name.split('/');
    parts.pop();

    return parts.join('/');
}
