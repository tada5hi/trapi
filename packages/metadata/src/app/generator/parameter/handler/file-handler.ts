/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DecoratorPropertyManager } from '../../../../adapters/decorator/property-manager';
import { DecoratorID } from '../../../../core/types/decorator-id';
import type { Type } from '../../../../core/types/resolver';
import { TypeName } from '../../../../core/types/type-name';
import { getDeclarationValidators } from '../../../../adapters/typescript/validator';
import { getInitializerValue } from '../../../../adapters/typescript/initializer';
import { ParameterSource } from '../../../../core/types/parameter-source';
import { ParameterError } from '../../../../core/error/parameter';
import type { Parameter } from '../../../../core/types/parameter';
import type { IParameterHandlerContext } from './types';

export function handleFileParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID.FILE}` | `${DecoratorID.FILES}`>,
): Parameter[] {
    const parameterName = ctx.getParameterName();
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
            extensions: [],
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
