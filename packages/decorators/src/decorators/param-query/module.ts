/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function Query(name?: string) {
    return (...args) => {};
}

export function QueryProp(name: string, options?: Record<string, any>) {
    return (...args) => { };
}
