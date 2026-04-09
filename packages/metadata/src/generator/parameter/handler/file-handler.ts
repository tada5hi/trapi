/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Identifier } from 'typescript';
import type { DecoratorPropertyManager } from '../../../decorator';
import { DecoratorID } from '../../../decorator';
import type { Type } from '../../../resolver';
import { TypeName } from '../../../resolver';
import { getDeclarationValidators, getInitializerValue } from '../../../utils';
import { ParameterSource } from '../constants';
import { ParameterError } from '../error';
import type { Parameter } from '../types';
import type { IParameterHandlerContext } from './types';

export function handleFileParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID.FILE}` | `${DecoratorID.FILES}`>,
): Parameter[] {
    const parameterName = (ctx.parameter.name as Identifier).text;
    let name = parameterName;
    const value = manager.get('value');
    if (typeof value === 'string') {
        name = value;
    }

    if (!ctx.isBodySupportedForMethod(ctx.method)) {
        throw ParameterError.methodUnsupported({
            decoratorName: manager.representation.name,
            propertyName: name,
            method: ctx.method,
            node: ctx.parameter,
        });
    }

    const elementType: Type = { typeName: TypeName.FILE };
    let type: Type;
    if (manager.representation.id === DecoratorID.FILES) {
        type = { typeName: TypeName.ARRAY, elementType };
    } else {
        type = elementType;
    }

    const { examples, exampleLabels } = ctx.getParameterExample(parameterName);

    return [
        {
            default: getInitializerValue(ctx.parameter.initializer, ctx.current.typeChecker, type),
            description: ctx.getParameterDescription(),
            examples,
            exampleLabels,
            in: ParameterSource.FORM_DATA,
            name: name || parameterName,
            parameterName,
            required: !ctx.parameter.questionToken && !ctx.parameter.initializer,
            type,
            deprecated: ctx.getParameterDeprecation(),
            validators: getDeclarationValidators(ctx.parameter, parameterName),
        },
    ];
}
