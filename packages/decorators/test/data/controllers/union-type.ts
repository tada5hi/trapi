/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Controller, Mount, Post } from '../../../src';
import { MyTypeWithUnion } from '../type';

@Controller()
@Mount('unionTypes')
export class TestUnionType {
    @Post()
    public post(body: MyTypeWithUnion): string {
        return '42';
    }
}
