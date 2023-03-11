/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Delete, Get, Mount, Path, Post, Put, QueryProp,
} from '../../../src';
import type * as Return from '../return-types';
import type { BasicModel } from '../type';

export class BasicEndpoint<T extends BasicModel> {
    protected list(@QueryProp('full') full?: boolean): Promise<T[]> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Post()
    protected save(entity: T): Promise<Return.NewResource<number>> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Put()
    @Mount('/:id')
    protected update(@Path('id') id: number, entity: T): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Delete()
    @Mount('/:id')
    protected remove(@Path('id') id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Get()
    @Mount('/:id')
    protected get(@Path('id') id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }
}
