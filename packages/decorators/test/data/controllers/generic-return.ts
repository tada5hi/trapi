/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller, Get, Method, PathParam,
} from '../../../src';
import type { MyDataType2 } from '../type';

@Controller('generics2')
export class DerivedEndpoint2 {
    @Get
    @Method(':param')
    protected test(@PathParam('param') param: string): Promise<MyDataType2> {
        return new Promise<MyDataType2>((resolve, reject) => {
            // content
        });
    }
}