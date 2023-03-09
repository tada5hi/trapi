/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get, IsLong, Method, PathParam,
} from '../../../src';
import { PrimitiveClassModel, PrimitiveInterfaceModel, ResponseBody } from '../type';

@Controller('primitives')
export class PrimitiveEndpoint {
    @Method('/class')
    @Get
    public getClass(): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }

    @Method('/interface')
    @Get
    public testInterface(): PrimitiveInterfaceModel {
        return {};
    }

    @Method(':id')
    @Get
    public getById(@PathParam('id') @IsLong id: number) {
        // ...
    }

    @Method('/arrayNative')
    @Get
    // tslint:disable-next-line:array-type
    public getArrayNative(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }

    @Method('/array')
    @Get
    public getArray(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }
}
