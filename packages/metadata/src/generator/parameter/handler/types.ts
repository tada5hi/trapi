/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type * as ts from 'typescript';
import type { DecoratorID, DecoratorPropertyManager  } from '../../../decorator';
import type {
    BaseType,
    NestedObjectLiteralType,
    RefObjectType,
    Type,
} from '../../../resolver';
import type { Example } from '../../types';
import type { IGeneratorContext } from '../../metadata';
import type { Parameter } from '../types';
import type { ParameterSource } from '../constants';

/**
 * Shared context passed to every parameter handler.
 * Provides access to the parameter declaration, HTTP method/path,
 * generator context, and shared utility methods.
 */
export interface IParameterHandlerContext {
    readonly parameter: ts.ParameterDeclaration;
    readonly method: string;
    readonly path: string;
    readonly current: IGeneratorContext;

    getParameterDescription(): string;
    getParameterDeprecation(): boolean;
    getParameterExample(parameterName: string): {
        examples: Example[] | undefined;
        exampleLabels: Array<string | undefined> | undefined;
    };
    getValidatedType(parameter: ts.ParameterDeclaration): Type;
    isBodySupportedForMethod(method: string): boolean;
    isTypeSupported(parameterType: BaseType): boolean;
    buildParametersForObject(
        type: NestedObjectLiteralType | RefObjectType,
        details: Omit<Partial<Parameter>, 'in'> & { in: `${ParameterSource}` },
    ): Parameter[];
}

/**
 * Type for parameter source handlers.
 */
export type ParameterHandler = (
    ctx: IParameterHandlerContext,
    manager: DecoratorPropertyManager<`${DecoratorID}`>,
) => Parameter[];
