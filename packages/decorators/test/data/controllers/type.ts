/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller, Get, Method, PathParam,
} from '../../../src';
import type { MyDataType2, SimpleHelloType } from '../type';

@Controller('type')
export class TypeEndpoint {
    @Get
    @Method(':param')
    public test(@PathParam('param') param: string): Promise<MyDataType2> {
        return new Promise<MyDataType2>((resolve, reject) => {
            // content
        });
    }

    @Get
    @Method(':param/2')
    public test2(@PathParam('param') param: string): Promise<SimpleHelloType> {
        return new Promise<SimpleHelloType>((resolve, reject) => {
            // content
        });
    }
}