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

export function handlePathParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID.PATH}` | `${DecoratorID.PATHS}`>,
): Parameter[] {
    const parameterName = ctx.getParameterName();
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
            extensions: [],
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
