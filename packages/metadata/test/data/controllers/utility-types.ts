/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get,
    Mount,
} from '../_stubs';

type Foo = {
    bar: string,
    baz: string
};

type FooBar = Pick<Foo, 'bar'>;
type FooBaz = Omit<Foo, 'bar'>;
type FooPartial = Partial<Foo>;

// Checker-resolvable utility types
type Status = 'active' | 'inactive' | 'deleted';
type ActiveStatus = Extract<Status, 'active' | 'inactive'>;
type NonDeletedStatus = Exclude<Status, 'deleted'>;

function createFoo(): Foo {
    return { bar: 'a', baz: 'b' };
}
type FooReturn = ReturnType<typeof createFoo>;
type FooParams = Parameters<typeof createFoo>;

type AwaitedFoo = Awaited<Promise<Foo>>;
type AwaitedNested = Awaited<Promise<Promise<Foo>>>;

class FooFactory {
    constructor(public name: string, public count: number) {}
}
type FooInstance = InstanceType<typeof FooFactory>;
type FooCtorParams = ConstructorParameters<typeof FooFactory>;

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
        return { baz: 'boz' };
    }

    @Get()
    @Mount('partial')
    public partial(): FooPartial {
        return {};
    }

    @Get()
    @Mount('extract')
    public extract(): ActiveStatus {
        return 'active';
    }

    @Get()
    @Mount('exclude')
    public exclude(): NonDeletedStatus {
        return 'active';
    }

    @Get()
    @Mount('return-type')
    public returnType(): FooReturn {
        return { bar: 'a', baz: 'b' };
    }

    @Get()
    @Mount('awaited')
    public awaited(): AwaitedFoo {
        return { bar: 'a', baz: 'b' };
    }

    @Get()
    @Mount('awaited-nested')
    public awaitedNested(): AwaitedNested {
        return { bar: 'a', baz: 'b' };
    }

    @Get()
    @Mount('instance-type')
    public instanceType(): FooInstance {
        return new FooFactory('test', 1);
    }

    @Get()
    @Mount('parameters')
    public parameters(): FooParams {
        return [] as unknown as FooParams;
    }

    @Get()
    @Mount('constructor-parameters')
    public constructorParameters(): FooCtorParams {
        return ['test', 1];
    }
}
