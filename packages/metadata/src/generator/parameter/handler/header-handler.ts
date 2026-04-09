/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identifier } from 'typescript';
import type { DecoratorID, DecoratorPropertyManager  } from '../../../decorator';
import { isNestedObjectLiteralType, isRefObjectType } from '../../../resolver';
import { getDeclarationValidators, getInitializerValue } from '../../../utils';
import { ParameterSource } from '../constants';
import { ParameterError } from '../error';
import type { Parameter } from '../types';
import type { IParameterHandlerContext } from './types';

export function handleHeaderParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID.HEADER}` | `${DecoratorID.HEADERS}`>,
): Parameter[] {
    const parameterName = (ctx.parameter.name as Identifier).text;
    let name = parameterName;

    const type = ctx.getValidatedType(ctx.parameter);

    const value = manager.get('value');
    if (typeof value === 'string') {
        name = value;
    }

    const { examples, exampleLabels } = ctx.getParameterExample(parameterName);

    if (
        isNestedObjectLiteralType(type) ||
        isRefObjectType(type)
    ) {
        return ctx.buildParametersForObject(type, {
            in: ParameterSource.HEADER,
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

    return [
        {
            default: getInitializerValue(ctx.parameter.initializer, ctx.current.typeChecker, type),
            description: ctx.getParameterDescription(),
            examples,
            exampleLabels,
            in: ParameterSource.HEADER,
            name: name || parameterName,
            parameterName,
            required: !ctx.parameter.questionToken && !ctx.parameter.initializer,
            type,
            deprecated: ctx.getParameterDeprecation(),
            validators: getDeclarationValidators(ctx.parameter, parameterName),
        },
    ];
}
