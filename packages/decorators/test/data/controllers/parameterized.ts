/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller, Get, Mount, Path,
} from '../../../src';
import { PrimitiveClassModel } from '../type';

@Controller()
@Mount('parameterized/:objectId')
export class ParameterizedEndpoint {
    @Mount('/test')
    @Get()
    public test(@Path('objectId') objectId: string): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }
}
