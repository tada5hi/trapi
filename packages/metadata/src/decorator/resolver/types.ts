/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import type { Node } from 'typescript';
import type { DecoratorID } from '../constants';
import type { DecoratorConfig } from '../types';
import type { DecoratorPropertyManager } from '../property-manager';
import type { NodeDecorator } from '../../utils';

export type DecoratorResolverMap = {
    [T in `${DecoratorID}`]?: DecoratorConfig<T>[];
};

export type DecoratorResolverContext = {
    preset?: string,
    decorators?: DecoratorConfig[]
};

export interface IDecoratorResolver {
    match<T extends `${DecoratorID}`>(
        id: T,
        data: NodeDecorator[] | Node,
    ): DecoratorPropertyManager<T> | undefined;
    apply(items: DecoratorConfig[]): void;
    applyPreset(name: string): Promise<void>;
}
