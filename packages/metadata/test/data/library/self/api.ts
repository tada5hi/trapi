/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    RequestConsumes, ResponseDescription, ResponseExample, ResponseProduces, SwaggerTags,
} from '@trapi/swagger';
import { GET, POST, Path } from '../typescript-rest/decorators';
import { Person } from '../type';

@Path('mypath')
@SwaggerTags('My Services')
export class MyService {
    @ResponseDescription<string>('default', 'Error')
    @ResponseDescription<string>(400, 'The request format was incorrect.')
    @ResponseDescription<string>(500, 'There was an unexpected error.')
    @GET
    public test(): string {
        return 'OK';
    }

    /**
     * a a
     *
     * @param body
     */
    @POST
    @ResponseExample<Person[]>([{
        name: 'Joe',
    }])
    @RequestConsumes('application/json', 'text/html')
    @ResponseProduces('application/json')
    public testPostString(body: string): Person[] {
        return [];
    }
}
