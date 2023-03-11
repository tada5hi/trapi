/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get, IsLong, Mount, PathParam,
} from '../../../src';
import { PrimitiveClassModel, PrimitiveInterfaceModel, ResponseBody } from '../type';

@Controller()
@Mount('primitives')
export class PrimitiveEndpoint {
    @Mount('/class')
    @Get()
    public getClass(): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }

    @Mount('/interface')
    @Get()
    public testInterface(): PrimitiveInterfaceModel {
        return {};
    }

    @Mount(':id')
    @Get()
    public getById(@PathParam('id') @IsLong id: number) {
        // ...
    }

    @Mount('/arrayNative')
    @Get()
    // tslint:disable-next-line:array-type
    public getArrayNative(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }

    @Mount('/array')
    @Get()
    public getArray(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }
}
