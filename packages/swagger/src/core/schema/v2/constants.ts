/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ParameterSourceV2 = {
    BODY: 'body',
    FORM_DATA: 'formData',
    HEADER: 'header',
    PATH: 'path',
    QUERY: 'query',
} as const;
export type ParameterSourceV2 = typeof ParameterSourceV2[keyof typeof ParameterSourceV2];
