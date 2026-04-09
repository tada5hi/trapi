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

export function handlePathParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID.PATH}` | `${DecoratorID.PATHS}`>,
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
        const output = ctx.buildParametersForObject(type, {
            in: ParameterSource.PATH,
            examples,
            exampleLabels,
        });

        for (const element of output) {
            if (
                (!ctx.path.includes(`{${element.name}}`)) &&
                (!ctx.path.includes(`:${element.name}`))
            ) {
                throw ParameterError.invalidPathMatch({
                    decoratorName: manager.representation.name,
                    propertyName: name,
                    path: ctx.path,
                    node: ctx.parameter,
                });
            }
        }

        return output;
    }

    if (!ctx.isTypeSupported(type)) {
        throw ParameterError.typeUnsupported({
            decoratorName: manager.representation.name,
            propertyName: name,
            type,
            node: ctx.parameter,
        });
    }

    if (
        (!ctx.path.includes(`{${name}}`)) &&
        (!ctx.path.includes(`:${name}`))
    ) {
        throw ParameterError.invalidPathMatch({
            decoratorName: manager.representation.name,
            propertyName: name,
            path: ctx.path,
            node: ctx.parameter,
        });
    }

    return [
        {
            default: getInitializerValue(ctx.parameter.initializer, ctx.current.typeChecker, type),
            description: ctx.getParameterDescription(),
            examples,
            exampleLabels,
            in: ParameterSource.PATH,
            name: name || parameterName,
            parameterName,
            required: true,
            type,
            deprecated: ctx.getParameterDeprecation(),
            validators: getDeclarationValidators(ctx.parameter, parameterName),
        },
    ];
}
