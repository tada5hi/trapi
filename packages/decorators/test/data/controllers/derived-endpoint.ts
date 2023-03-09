/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller, Get, Method, PathParam,
} from '../../../src';
import type { BasicModel } from '../type';
import { BasicEndpoint } from './basic-endpoint';

export interface MyDatatype extends BasicModel {
    property1: string;
}

@Controller('generics1')
export class DerivedEndpoint extends BasicEndpoint<MyDatatype> {
    @Get
    @Method(':param')
    protected test(@PathParam('param') param: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // content
        });
    }
}
