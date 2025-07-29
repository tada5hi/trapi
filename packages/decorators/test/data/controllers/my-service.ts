/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Accept, Body, Controller,
    Description,
    Example,
    FormProp,
    Get,
    Mount,
    Post,
    QueryProp,
    Tags,
} from '../../../src';
import {
    Person, TestEnum, TestInterface, TestMixedEnum, TestNumericEnum,
} from '../type';

@Controller()
@Accept('text/plain')
@Mount('mypath')
@Tags('My Services', 'Foo')
export class MyService {
    @Description<string>('default', 'Error')
    @Description<string>(400, 'The request format was incorrect.')
    @Description<string>(500, 'There was an unexpected error.')
    @Get()
    @Accept('text/html')
    public test(): string {
        return 'OK';
    }

    /**
     * This is the method description
     * @param test This is the test param description
     * @param test2
     * @param test3
     * @param test4
     * @param test5
     * @param test6
     */
    @Get()
    @Mount('secondpath')
    @Example<Person>({
        name: 'Joe',
    })
    @Description<Person>(200, 'The success test.')
    public test2(
        @QueryProp('testRequired') test: string,
        // eslint-disable-next-line default-param-last
            @QueryProp('testDefault') test2 = 'value',
            @QueryProp('testOptional') test3?: string,
            @QueryProp('testEnum') test4?: TestEnum,
            @QueryProp('testNumericEnum') test5?: TestNumericEnum,
            @QueryProp('testMixedEnum') test6?: TestMixedEnum,
    ): Person {
        return { name: 'OK' };
    }

    @Post()
    @Example<Person[]>([{
        name: 'Joe',
    }])
    public testPostString(@Body('name') body: string): Person[] {
        return [];
    }

    @Post()
    @Mount('obj')
    public testPostObject(data: object) {
        return data;
    }

    @Get()
    @Mount('multi-query')
    public testMultiQuery(
    @QueryProp('id') ids: string[],
        @QueryProp('name', { collectionFormat: 'multi', allowEmptyValue: true }) names?: string | string[],
    ) {
        return { ids, names };
    }

    @Get()
    @Mount('default-query')
    public testDefaultQuery(
    @QueryProp('num') num = 5,
        @QueryProp('str') str = 'default value',
        @QueryProp('bool1') bool1 = true,
        @QueryProp('bool2') bool2 = false,
        @QueryProp('arr') arr: string[] = ['a', 'b', 'c'],
    ) {

    }

    @Post()
    @Mount('test-compiler-options')
    public async testCompilerOptions(payload: TestInterface): Promise<TestInterface> {
        return { a: 'string', b: 123 };
    }

    @Post()
    @Mount('test-form-param')
    public testFormParam(@FormProp('id') id: string): string {
        return id;
    }
}
