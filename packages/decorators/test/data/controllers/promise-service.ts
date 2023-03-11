/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Description,
    Example,
    Get,
    Mount,
    Path,
    Post,
    Produces,
    QueryProp,
} from '../../../src';
import * as Return from '../return-types';
import { Person } from '../type';
import { BaseService } from '../utils';

@Controller()
@Mount('promise')
export class PromiseService extends BaseService {
    /**
     * Esta eh a da classe
     * @param test Esta eh a description do param teste
     */
    @Description<string>(401, 'Unauthorized')
    @Get()
    public test(@QueryProp('testParam') test?: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @Description<Person>(200, 'All Good')
    @Description<string>(401, 'Unauthorized')
    @Example<Person>({ name: 'Test Person' })
    @Get()
    @Mount(':id')
    public testGetSingle(@Path('id') id: string): Promise<Person> {
        return new Promise<Person>((resolve, reject) => {
            resolve({ name: 'OK' });
        });
    }

    @Description<Person>(201, 'Person Created', { name: 'Test Person' })
    @Description<string>(401, 'Unauthorized')
    @Example<Person>({ name: 'Example Person' }) // NOTE: this is here to test that it doesn't overwrite the example in the @Response above
    @Post()
    public testPost(obj: Person): Promise<Return.NewResource<Person>> {
        return new Promise<Return.NewResource<Person>>((resolve, reject) => {
            resolve(new Return.NewResource<Person>('id', { name: 'OK' }));
        });
    }

    @Get()
    @Mount('myFile')
    @Produces('application/pdf')
    public testFile(@QueryProp('testParam') test?: string): Promise<Return.DownloadBinaryData> {
        return new Promise<Return.DownloadBinaryData>((resolve, reject) => {
            resolve(null);
        });
    }
}
