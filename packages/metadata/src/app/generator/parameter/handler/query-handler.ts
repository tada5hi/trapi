/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'locter';
import type { DecoratorID } from '../../../../core/types/decorator-id';
import type { DecoratorPropertyManager } from '../../../../adapters/decorator/property-manager';
import {
    isArrayType,
    isNestedObjectLiteralType,
    isRefEnumType,
    isRefObjectType,
    isUnionType,
} from '../../../../core/types/type-guards';
import type { Type } from '../../../../core/types/resolver';
import { getDeclarationValidators } from '../../../../adapters/typescript/validator';
import { getInitializerValue } from '../../../../adapters/typescript/initializer';
import { CollectionFormat, ParameterSource } from '../../../../core/types/parameter-source';
import { ParameterError } from '../../../../core/error/parameter';
import type { ArrayParameter, Parameter } from '../../../../core/types/parameter';
import type { IParameterHandlerContext } from './types';

export function handleQueryParameter(
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID.QUERY}`>,
): Parameter[] | ArrayParameter[] {
    const parameterName = ctx.getParameterName();
    const type = ctx.getValidatedType(ctx.parameter);

    let name: string = parameterName;
    let options: Record<string, any> = {};

    let source = ParameterSource.QUERY;

    const nameValue = manager.get('value');
    if (typeof nameValue === 'string') {
        name = nameValue;
        source = ParameterSource.QUERY_PROP;
    }

    const optionsValue = manager.get('options');
    if (isObject(optionsValue)) {
        options = optionsValue;
    }

    const { examples, exampleLabels } = ctx.getParameterExample(parameterName);

    if (source === ParameterSource.QUERY) {
        if (
            isNestedObjectLiteralType(type) ||
            isRefObjectType(type)
        ) {
            return ctx.buildParametersForObject(type, {
                in: ParameterSource.QUERY_PROP,
                examples,
                exampleLabels,
            });
        }
    }

    const properties: Parameter = {
        allowEmptyValue: options.allowEmptyValue,
        collectionFormat: options.collectionFormat,
        default: getInitializerValue(ctx.parameter.initializer, ctx.current.typeChecker, type),
        description: ctx.getParameterDescription(),
        examples,
        exampleLabels,
        in: source,
        maxItems: options.maxItems,
        minItems: options.minItems,
        name,
        parameterName,
        required: !ctx.parameter.questionToken && !ctx.parameter.initializer,
        type,
        deprecated: ctx.getParameterDeprecation(),
        validators: getDeclarationValidators(ctx.parameter, parameterName),
    };

    if (isArrayType(type)) {
        if (!ctx.isTypeSupported(type.elementType)) {
            throw ParameterError.typeUnsupported({
                decoratorName: manager.representation.name,
                propertyName: name,
                type: type.elementType,
                node: ctx.parameter,
            });
        }

        return [{
            ...properties,
            collectionFormat: properties.collectionFormat ?? CollectionFormat.MULTI,
            type,
        }];
    }

    if (!isTypeSupportedForQuery(ctx, type)) {
        throw ParameterError.typeUnsupported({
            decoratorName: manager.representation.name,
            propertyName: name,
            type,
            node: ctx.parameter,
        });
    }

    return [properties];
}

function isTypeSupportedForQuery(ctx: IParameterHandlerContext, type: Type): boolean {
    return ctx.isTypeSupported(type) ||
        isRefEnumType(type) ||
        isUnionType(type);
}
