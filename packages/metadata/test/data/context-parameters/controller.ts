/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get,
    Next,
    QueryProp,
    Request,
    Response,
} from '../_stubs';

// A framework's request/response objects: their type graph must not reach
// the reference-type map through a parameter that produces no OpenAPI
// parameter.
interface IFrameworkSocket {
    remoteAddress: string;
}

interface IFrameworkRequest {
    socket: IFrameworkSocket;
    // Also the return type below: still registered through that route.
    user: IContextUser;
}

interface IFrameworkResponse {
    statusCode: number;
}

interface IFrameworkNext {
    (error?: IFrameworkError): void;
}

interface IFrameworkError {
    message: string;
}

interface IContextUser {
    id: string;
}

@Controller('/context')
export class ContextParameterController {
    @Get('/')
    public get(
        @Request() _req: IFrameworkRequest,
        @Response() _res: IFrameworkResponse,
        @Next() _next: IFrameworkNext,
        @QueryProp('filter') _filter: string,
    ): IContextUser {
        return { id: '1' };
    }
}
