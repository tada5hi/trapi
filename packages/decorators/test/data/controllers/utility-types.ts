/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller, Get, Mount,
} from '../../../src';

type Foo = {
    bar: string,
    baz: string
};

type FooBar = Pick<Foo, 'bar'>;
type FooBaz = Omit<Foo, 'bar'>;
type FooPartial = Partial<Foo>;

@Controller()
@Mount('utility-types')
export class UtilityTypes {
    @Get()
    @Mount('pick')
    public pick(): FooBar {
        return { bar: 'baz' };
    }

    @Get()
    @Mount('omit')
    public omit(): FooBaz {
        return {
            baz: 'boz',
        };
    }

    @Get()
    @Mount('partial')
    public partial(): FooPartial {
        return {};
    }
}
