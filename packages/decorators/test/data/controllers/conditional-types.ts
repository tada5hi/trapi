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

// Regression test for #753: mimics the typeof-globalThis conditional
// pattern used by @types/node for web standard types like Headers.
// With `types: ['node']`, globalThis has onmessage, so this resolves to
// the true branch — just like @types/node's `_Headers` resolves to `{}`.
type WebStyleConditional = typeof globalThis extends { onmessage: any } ?
    { resolved: boolean } :
    { fallback: boolean };

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

    // Regression test for #753: @types/node defines Headers via a conditional
    // like `typeof globalThis extends { onmessage: any } ? {} : SomeClass`.
    // This synthetic conditional mimics that pattern to verify the resolver
    // handles typeof-globalThis conditional types without crashing.
    @Get()
    @Mount('web-headers')
    public webHeaders(): WebStyleConditional {
        return { resolved: true };
    }
}
