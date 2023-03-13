/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Controller, Mount, Post } from '../../../src';
import type { TestInterface } from '../type';
import { MyTypeWithUnion } from '../type';

type MyComplexUnionType = {
    id: string,
    union: null | TestInterface
};

@Controller()
@Mount('unionTypes')
export class TestUnionType {
    @Post()
    public post(body: MyTypeWithUnion): string {
        return '42';
    }

    @Post()
    @Mount('/complex')
    public postComplex(body: MyComplexUnionType): string {
        return '43';
    }
}
