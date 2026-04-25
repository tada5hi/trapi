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

export type Registry = {
    controllers: ControllerHandler[];
    methods: MethodHandler[];
    parameters: ParameterHandler[];
    controllerJsDoc: ControllerJsDocHandler[];
    methodJsDoc: MethodJsDocHandler[];
    parameterJsDoc: ParameterJsDocHandler[];
};

export function createRegistry(): Registry {
    return {
        controllers: [],
        methods: [],
        parameters: [],
        controllerJsDoc: [],
        methodJsDoc: [],
        parameterJsDoc: [],
    };
}
