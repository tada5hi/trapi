/*
 * Copyright (c) 2021-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Preset } from '@trapi/metadata';
import {
    controllerHandlers,
    controllerJsDocHandlers,
    methodHandlers,
    methodJsDocHandlers,
    parameterHandlers,
    parameterJsDocHandlers,
} from './handlers';

const preset: Preset = {
    name: '@trapi/preset-decorators-express',
    controllers: controllerHandlers,
    methods: methodHandlers,
    parameters: parameterHandlers,
    controllerJsDoc: controllerJsDocHandlers,
    methodJsDoc: methodJsDocHandlers,
    parameterJsDoc: parameterJsDocHandlers,
};

export { preset };
export default preset;
