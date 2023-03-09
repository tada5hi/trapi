/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Delete, Get, Method, PathParam, Post, Put, QueryParam,
} from '../../../src';
import type * as Return from '../return-types';
import type { BasicModel } from '../type';

export class BasicEndpoint<T extends BasicModel> {
    protected list(@QueryParam('full') full?: boolean): Promise<T[]> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Post
    protected save(entity: T): Promise<Return.NewResource<number>> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Put
    @Method('/:id')
    protected update(@PathParam('id') id: number, entity: T): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Delete
    @Method('/:id')
    protected remove(@PathParam('id') id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @Get
    @Method('/:id')
    protected get(@PathParam('id') id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }
}
