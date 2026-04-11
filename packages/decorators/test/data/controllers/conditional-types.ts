/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get,
    Mount,
} from '../../../src';

type Foo = {
    bar: string,
    baz: string
};

// Conditional type: resolves to Foo since string extends string
type ConditionalFoo = string extends string ? Foo : never;

// Wrapped generic utility type: Box<T> = Awaited<T>
type Box<T> = Awaited<T>;
type UnboxedFoo = Box<Promise<Foo>>;

// Nested wrapped generic: MyPick<T, K> = Pick<T, K>
type MyPick<T, K extends keyof T> = Pick<T, K>;
type PickedFoo = MyPick<Foo, 'bar'>;

@Controller()
@Mount('conditional-types')
export class ConditionalTypesController {
    @Get()
    @Mount('conditional')
    public conditional(): ConditionalFoo {
        return { bar: 'a', baz: 'b' };
    }

    @Get()
    @Mount('wrapped-awaited')
    public wrappedAwaited(): UnboxedFoo {
        return { bar: 'a', baz: 'b' };
    }

    @Get()
    @Mount('wrapped-pick')
    public wrappedPick(): PickedFoo {
        return { bar: 'a' };
    }
}
