/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type * as ts from 'typescript';
import type {
    BaseType,
    NestedObjectLiteralType,
    RefObjectType,
    Type,
} from '../../../../core/types/resolver';
import type { Example } from '../../../../core/types/generator';
import type { IGeneratorContext } from '../../../../core/types/metadata';
import type { Parameter } from '../../../../core/types/parameter';
import type { ParameterSource } from '../../../../core/types/parameter-source';

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

    getParameterName(): string;
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
