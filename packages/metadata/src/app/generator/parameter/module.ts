/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type * as ts from 'typescript';
import type { DecoratorPropertyManager } from '../../../adapters/decorator';
import { DecoratorID } from '../../../core/types/decorator-id';
import { getNodeDecorators } from '../../../adapters/typescript/node-utils';
import type { IGeneratorContext } from '../../../core/types/metadata';
import {
    ParameterHandlerContext,
    handleBodyParameter,
    handleContextParameter,
    handleCookieParameter,
    handleFileParameter,
    handleFormParameter,
    handleHeaderParameter,
    handleParamParameter,
    handlePathParameter,
    handleQueryParameter,
} from './handler';
import type { IParameterGenerator, Parameter } from '../../../core/types/parameter';

const parameterKeys: `${DecoratorID}`[] = [
    DecoratorID.CONTEXT,
    DecoratorID.PARAM,
    DecoratorID.PARAMS,
    DecoratorID.QUERY,
    DecoratorID.FORM,
    DecoratorID.BODY,
    DecoratorID.HEADER,
    DecoratorID.HEADERS,
    DecoratorID.COOKIE,
    DecoratorID.COOKIES,
    DecoratorID.PATH,
    DecoratorID.PATHS,
    DecoratorID.FILE,
    DecoratorID.FILES,
];

export class ParameterGenerator implements IParameterGenerator {
    private readonly ctx: ParameterHandlerContext;

    private readonly current: IGeneratorContext;

    constructor(
        parameter: ts.ParameterDeclaration,
        method: string,
        path: string,
        current: IGeneratorContext,
    ) {
        this.current = current;
        this.ctx = new ParameterHandlerContext(parameter, method, path, current);
    }

    public generate(): Parameter[] {
        const decorators = getNodeDecorators(this.ctx.parameter);

        for (const parameterKey of parameterKeys) {
            const manager = this.current.decoratorResolver.match(parameterKey, decorators);
            if (typeof manager === 'undefined') {
                continue;
            }

            const result = this.dispatch(manager);
            if (result) {
                return result;
            }
        }

        return handleBodyParameter(this.ctx);
    }

    private dispatch(manager: DecoratorPropertyManager<`${DecoratorID}`>): Parameter[] | undefined {
        switch (manager.representation.id) {
            case DecoratorID.CONTEXT:
                return handleContextParameter(this.ctx);
            case DecoratorID.PARAM:
            case DecoratorID.PARAMS:
                return handleParamParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.PARAM}`>,
                );
            case DecoratorID.FORM:
                return handleFormParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.FORM}`>,
                );
            case DecoratorID.QUERY:
                return handleQueryParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.QUERY}`>,
                );
            case DecoratorID.BODY:
                return handleBodyParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.BODY}`>,
                );
            case DecoratorID.HEADER:
            case DecoratorID.HEADERS:
                return handleHeaderParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.HEADER}`>,
                );
            case DecoratorID.COOKIE:
            case DecoratorID.COOKIES:
                return handleCookieParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.COOKIE}`>,
                );
            case DecoratorID.PATH:
            case DecoratorID.PATHS:
                return handlePathParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.PATH}`>,
                );
            case DecoratorID.FILE:
            case DecoratorID.FILES:
                return handleFileParameter(
                    this.ctx,
                    manager as DecoratorPropertyManager<`${DecoratorID.FILE}`>,
                );
            default:
                return undefined;
        }
    }
}
