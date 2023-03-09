/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller, Get, Method, PathParam,
} from '../../../src';
import { PrimitiveClassModel } from '../type';

@Controller('parameterized/:objectId')
export class ParameterizedEndpoint {
    @Method('/test')
    @Get
    public test(@PathParam('objectId') objectId: string): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }
}
