/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorID, DecoratorPropertyManager  } from '../../../decorator';
import { getDeclarationValidators, getInitializerValue } from '../../../utils';
import { ParameterSource } from '../constants';
import { ParameterError } from '../error';
import type { Parameter } from '../types';
import type { IParameterHandlerContext } from './types';

export function handleBodyParameter(
    ctx: IParameterHandlerContext,
    manager?: DecoratorPropertyManager<`${DecoratorID.BODY}` | `${DecoratorID.PARAM}` | `${DecoratorID.PARAMS}`>,
): Parameter[] {
    const parameterName = ctx.getParameterName();
    let name = parameterName;

    let source = ParameterSource.BODY;

    if (manager) {
        const value = manager.get('value');
        if (typeof value === 'string') {
            name = value;
            source = ParameterSource.BODY_PROP;
        }
    }

    const type = ctx.getValidatedType(ctx.parameter);
    if (!ctx.isBodySupportedForMethod(ctx.method)) {
        throw ParameterError.methodUnsupported({
            decoratorName: manager ? manager.representation.name : 'Body',
            propertyName: name,
            method: ctx.method,
            node: ctx.parameter,
        });
    }

    const { examples, exampleLabels } = ctx.getParameterExample(parameterName);

    return [
        {
            default: getInitializerValue(ctx.parameter.initializer, ctx.current.typeChecker, type),
            description: ctx.getParameterDescription(),
            examples,
            exampleLabels,
            in: source,
            name: name || parameterName,
            parameterName,
            required: !ctx.parameter.questionToken && !ctx.parameter.initializer,
            type,
            deprecated: ctx.getParameterDeprecation(),
            validators: getDeclarationValidators(ctx.parameter, parameterName),
        },
    ];
}
