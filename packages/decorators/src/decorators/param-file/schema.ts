/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecoratorID } from '@trapi/metadata';
import type { DecoratorConfig } from '@trapi/metadata';

export function buildFileParamConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.FILE_PARAM,
        name: name || 'FileParam',
        properties: {
            value: {},
        },
    };
}
export function buildFilesParamsConfig(name?: string) : DecoratorConfig {
    return {
        id: DecoratorID.FILES_PARAM,
        name: name || 'FilesParam',
        properties: {
            value: {},
        },
    };
}
