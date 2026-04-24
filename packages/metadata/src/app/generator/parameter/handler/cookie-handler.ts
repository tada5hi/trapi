/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID } from '../../../../core/types/decorator-id';
import type { DecoratorPropertyManager } from '../../../../adapters/decorator/property-manager';
import { isNestedObjectLiteralType, isRefObjectType } from '../../../../core/types/type-guards';
import { getDeclarationValidators } from '../../../../adapters/typescript/validator';
import { getInitializerValue } from '../../../../adapters/typescript/initializer';
import { ParameterSource } from '../../../../core/types/parameter-source';
import { ParameterError } from '../../../../core/error/parameter';
import type { Parameter } from '../../../../core/types/parameter';
import type { IParameterHandlerContext } from './types';

export function handleCookieParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<
        `${DecoratorID.COOKIE}` |
        `${DecoratorID.COOKIES}` |
        `${DecoratorID.PARAM}` |
        `${DecoratorID.PARAMS}`
    >,
): Parameter[] {
    const parameterName = ctx.getParameterName();
    let name = parameterName;

    const type = ctx.getValidatedType(ctx.parameter);

    const { examples, exampleLabels } = ctx.getParameterExample(parameterName);

    if (
        isNestedObjectLiteralType(type) ||
        isRefObjectType(type)
    ) {
        return ctx.buildParametersForObject(type, {
            in: ParameterSource.COOKIE,
            examples,
            exampleLabels,
        });
    }

    if (!ctx.isTypeSupported(type)) {
        throw ParameterError.typeUnsupported({
            decoratorName: manager.representation.name,
            propertyName: name,
            type,
            node: ctx.parameter,
        });
    }

    const value = manager.get('value');
    if (typeof value === 'string') {
        name = value;
    }

    return [
        {
            default: getInitializerValue(ctx.parameter.initializer, ctx.current.typeChecker, type),
            description: ctx.getParameterDescription(),
            examples,
            exampleLabels,
            in: ParameterSource.COOKIE,
            name: name || parameterName,
            parameterName,
            required: !ctx.parameter.questionToken && !ctx.parameter.initializer,
            type,
            deprecated: ctx.getParameterDeprecation(),
            validators: getDeclarationValidators(ctx.parameter, parameterName),
        },
    ];
}
