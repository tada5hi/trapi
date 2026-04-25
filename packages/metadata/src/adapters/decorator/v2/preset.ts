/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ControllerHandler,
    ControllerJsDocHandler,
    MethodHandler,
    MethodJsDocHandler,
    ParameterHandler,
    ParameterJsDocHandler,
} from './handler';

export type Preset = {
    name: string;
    extends?: string[];
    controllers?: ControllerHandler[];
    methods?: MethodHandler[];
    parameters?: ParameterHandler[];
    controllerJsDoc?: ControllerJsDocHandler[];
    methodJsDoc?: MethodJsDocHandler[];
    parameterJsDoc?: ParameterJsDocHandler[];
};
