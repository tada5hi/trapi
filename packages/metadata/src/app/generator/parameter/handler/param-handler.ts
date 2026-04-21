/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../../../../core/types/decorator-id';
import type { DecoratorPropertyManager } from '../../../../adapters/decorator/property-manager';
import type { Parameter } from '../../../../core/types/parameter';
import type { IParameterHandlerContext } from './types';
import { handleBodyParameter } from './body-handler';
import { handleCookieParameter } from './cookie-handler';

export function handleParamParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID.PARAM}` | `${DecoratorID.PARAMS}`>,
): Parameter[] {
    return [
        ...handleBodyParameter(ctx, manager),
        ...handleCookieParameter(ctx, manager),
    ];
}
