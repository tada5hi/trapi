/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import * as swagger from '@trapi/preset-swagger';
import {
    Accept, DELETE, FormParam, GET, POST,
    PUT, Path, PathParam, QueryParam,
    Security,
} from './decorators';
import * as Return from './return-types';
import type {
    BasicModel,
    MyDataType2,
    SimpleHelloType,
} from '../type';
import {
    MyTypeWithUnion,
    NamedEntity,
    Person,
    PrimitiveClassModel,
    PrimitiveInterfaceModel,
    ResponseBody,
    TestEnum,
    TestInterface,
    TestMixedEnum,
    TestNumericEnum,
} from '../type';

@Path('unionTypes')
export class TestUnionType {
    @POST
    public post(body: MyTypeWithUnion): string {
        return '42';
    }
}

@Accept('text/plain')
@Path('mypath')
@swagger.SwaggerTags('My Services', 'Foo')
export class MyService {
    @swagger.ResponseDescription<string>('default', 'Error')
    @swagger.ResponseDescription<string>(400, 'The request format was incorrect.')
    @swagger.ResponseDescription<string>(500, 'There was an unexpected error.')
    @GET
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
    @GET
    @Path('secondpath')
    @swagger.ResponseExample<Person>({
        name: 'Joe',
    })
    @swagger.ResponseDescription<Person>(200, 'The success test.')
    public test2(
        @QueryParam('testRequired') test: string,
            @QueryParam('testDefault') test2 = 'value',
            @QueryParam('testOptional') test3?: string,
            @QueryParam('testEnum') test4?: TestEnum,
            @QueryParam('testNumericEnum') test5?: TestNumericEnum,
            @QueryParam('testMixedEnum') test6?: TestMixedEnum,
    ): Person {
        return { name: 'OK' };
    }

    @POST
    @swagger.ResponseExample<Person[]>([{
        name: 'Joe',
    }])
    public testPostString(body: string): Person[] {
        return [];
    }

    @Path('obj')
    @POST
    public testPostObject(data: object) {
        return data;
    }

    @GET
    @Path('multi-query')
    public testMultiQuery(
    @QueryParam('id') ids: string[],
        @QueryParam('name', { collectionFormat: 'multi', allowEmptyValue: true }) names?: string | string[],
    ) {
        return { ids, names };
    }

    @GET
    @Path('default-query')
    public testDefaultQuery(
        @QueryParam('num') num = 5,
        @QueryParam('str') str = 'default value',
        @QueryParam('bool1') bool1 = true,
        @QueryParam('bool2') bool2 = false,
        @QueryParam('arr') arr: string[] = ['a', 'b', 'c'],
    ) {

    }

    @POST
    @Path('test-compiler-options')
    public async testCompilerOptions(payload: TestInterface): Promise<TestInterface> {
        return { a: 'string', b: 123 };
    }

    @POST
    @Path('test-form-param')
    public testFormParam(@FormParam('id') id: string): string {
        return id;
    }
}

class BaseService {
    @DELETE
    @Path(':id')
    public testDelete(@PathParam('id') id: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            resolve();
        });
    }
}

@Path('promise')
export class PromiseService extends BaseService {
    /**
     * Esta eh a da classe
     * @param test Esta eh a description do param teste
     */
    @swagger.ResponseDescription<string>(401, 'Unauthorized')
    @GET
    public test(@QueryParam('testParam') test?: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @swagger.ResponseDescription<Person>(200, 'All Good')
    @swagger.ResponseDescription<string>(401, 'Unauthorized')
    @swagger.ResponseExample<Person>({ name: 'Test Person' })
    @GET
    @Path(':id')
    public testGetSingle(@PathParam('id') id: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @swagger.ResponseDescription<Person>(201, 'Person Created', { name: 'Test Person' })
    @swagger.ResponseDescription<string>(401, 'Unauthorized')
    @swagger.ResponseExample<Person>({ name: 'Example Person' }) // NOTE: this is here to test that it doesn't overwrite the example in the @Response above
    @POST
    public testPost(obj: Person): Promise<Return.NewResource<Person>> {
        return new Promise<Return.NewResource<Person>>((resolve, reject) => {
            resolve(new Return.NewResource<Person>('id', { name: 'OK' }));
        });
    }

    @GET
    @Path('myFile')
    @swagger.ResponseProduces('application/pdf')
    public testFile(@QueryParam('testParam') test?: string): Promise<Return.DownloadBinaryData> {
        return new Promise<Return.DownloadBinaryData>((resolve, reject) => {
            resolve(null);
        });
    }
}

export class BasicEndpoint<T extends BasicModel> {
    protected list(@QueryParam('full') full?: boolean): Promise<T[]> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @POST
    protected save(entity: T): Promise<Return.NewResource<number>> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @PUT
    @Path('/:id')
    protected update(@PathParam('id') id: number, entity: T): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @DELETE
    @Path('/:id')
    protected remove(@PathParam('id') id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }

    @GET
    @Path('/:id')
    protected get(@PathParam('id') id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            // todo
        });
    }
}

export interface MyDatatype extends BasicModel {
    property1: string;
}

@Path('generics1')
export class DerivedEndpoint extends BasicEndpoint<MyDatatype> {
    @GET
    @Path(':param')
    protected test(@PathParam('param') param: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // content
        });
    }
}

@Path('generics2')
export class DerivedEndpoint2 {
    @GET
    @Path(':param')
    protected test(@PathParam('param') param: string): Promise<MyDataType2> {
        return new Promise<MyDataType2>((resolve, reject) => {
            // content
        });
    }
}

@Path('type')
export class TypeEndpoint {
    @GET
    @Path(':param')
    public test(@PathParam('param') param: string): Promise<MyDataType2> {
        return new Promise<MyDataType2>((resolve, reject) => {
            // content
        });
    }

    @GET
    @Path(':param/2')
    public test2(@PathParam('param') param: string): Promise<SimpleHelloType> {
        return new Promise<SimpleHelloType>((resolve, reject) => {
            // content
        });
    }
}

@Path('primitives')
export class PrimitiveEndpoint {
    @Path('/class')
    @GET
    public getClass(): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }

    @Path('/interface')
    @GET
    public testInterface(): PrimitiveInterfaceModel {
        return {};
    }

    @Path(':id')
    @GET
    public getById(@PathParam('id') @swagger.IsLong id: number) {
        // ...
    }

    @Path('/arrayNative')
    @GET
    // tslint:disable-next-line:array-type
    public getArrayNative(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }

    @Path('/array')
    @GET
    public getArray(): ResponseBody<string[]> {
        return { data: ['hello', 'world'] };
    }
}

@Path('parameterized/:objectId')
export class ParameterizedEndpoint {
    @Path('/test')
    @GET
    public test(@PathParam('objectId') objectId: string): PrimitiveClassModel {
        return new PrimitiveClassModel();
    }
}

@Path('abstract')
export class AbstractEntityEndpoint {
    @GET
    public get(): NamedEntity {
        return new NamedEntity();
    }
}

@Path('secure')
@Security(['ROLE_1', 'ROLE_2'], 'access_token')
export class SecureEndpoint {
    @GET
    public get(): string {
        return 'Access Granted';
    }

    @POST
    @Security([], 'user_email')
    public post(): string {
        return 'Posted';
    }
}

@Path('supersecure')
@Security('access_token')
@Security('user_email')
@Security()
export class SuperSecureEndpoint {
    @GET
    public get(): string {
        return 'Access Granted';
    }
}

@Path('response')
@swagger.ResponseDescription<string>(400, 'The request format was incorrect.')
@swagger.ResponseDescription<string>(500, 'There was an unexpected error.')
export class ResponseController {
    @GET
    public get(): string {
        return '42';
    }

    @swagger.ResponseDescription<string>(401, 'Unauthorized.')
    @swagger.ResponseDescription<string>(502, 'Internal server error.')
    @GET
    @Path('/test')
    public test(): string {
        return 'OK';
    }
}
