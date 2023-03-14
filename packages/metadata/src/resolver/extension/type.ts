/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export interface Extension {
    key: string;
    value: ExtensionType | ExtensionType[];
}

export type ExtensionType =
    string
    | number
    | boolean
    | null
    | ExtensionType[]
    | { [name: string]: ExtensionType | ExtensionType[] };
