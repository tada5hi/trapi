/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Accept, Controller,
    Description,
    Example,
    FormParam,
    Get,
    Method,
    Post,
    QueryParam,
    Tags,
} from '../../../src';
import {
    Person, TestEnum, TestInterface, TestMixedEnum, TestNumericEnum,
} from '../type';

@Accept('text/plain')
@Controller('mypath')
@Tags('My Services', 'Foo')
export class MyService {
    @Description<string>('default', 'Error')
    @Description<string>(400, 'The request format was incorrect.')
    @Description<string>(500, 'There was an unexpected error.')
    @Get
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
    @Get
    @Method('secondpath')
    @Example<Person>({
        name: 'Joe',
    })
    @Description<Person>(200, 'The success test.')
    public test2(
        @QueryParam('testRequired') test: string,
        // eslint-disable-next-line default-param-last
            @QueryParam('testDefault') test2 = 'value',
            @QueryParam('testOptional') test3?: string,
            @QueryParam('testEnum') test4?: TestEnum,
            @QueryParam('testNumericEnum') test5?: TestNumericEnum,
            @QueryParam('testMixedEnum') test6?: TestMixedEnum,
    ): Person {
        return { name: 'OK' };
    }

    @Post
    @Example<Person[]>([{
        name: 'Joe',
    }])
    public testPostString(body: string): Person[] {
        return [];
    }

    @Method('obj')
    @Post
    public testPostObject(data: object) {
        return data;
    }

    @Get
    @Method('multi-query')
    public testMultiQuery(
    @QueryParam('id') ids: string[],
        @QueryParam('name', { collectionFormat: 'multi', allowEmptyValue: true }) names?: string | string[],
    ) {
        return { ids, names };
    }

    @Get
    @Method('default-query')
    public testDefaultQuery(
        @QueryParam('num') num = 5,
        @QueryParam('str') str = 'default value',
        @QueryParam('bool1') bool1 = true,
        @QueryParam('bool2') bool2 = false,
        @QueryParam('arr') arr: string[] = ['a', 'b', 'c'],
    ) {

    }

    @Post
    @Method('test-compiler-options')
    public async testCompilerOptions(payload: TestInterface): Promise<TestInterface> {
        return { a: 'string', b: 123 };
    }

    @Post
    @Method('test-form-param')
    public testFormParam(@FormParam('id') id: string): string {
        return id;
    }
}
