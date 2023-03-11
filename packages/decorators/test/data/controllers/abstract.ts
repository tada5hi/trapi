/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Controller, Get, Mount } from '../../../src';
import { NamedEntity } from '../type';

@Controller()
@Mount('abstract')
export class AbstractEntityEndpoint {
    @Get()
    public get(): NamedEntity {
        return new NamedEntity();
    }
}
