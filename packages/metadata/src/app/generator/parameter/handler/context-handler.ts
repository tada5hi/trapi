/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ParameterSource } from '../../../../core/types/parameter-source';
import type { Parameter } from '../../../../core/types/parameter';
import type { IParameterHandlerContext } from './types';

export function handleContextParameter(
    ctx: IParameterHandlerContext,
): Parameter[] {
    const parameterName = ctx.getParameterName();

    return [
        {
            description: ctx.getParameterDescription(),
            in: ParameterSource.CONTEXT,
            name: parameterName,
            parameterName,
            required: !ctx.parameter.questionToken,
            type: null,
        },
    ];
}
