/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Delete,
    Description,
    Example,
    Get,
    Post,
    Status,
} from '../_stubs';

interface IRunView {
    id: string;
}

@Controller('/runs')
export class SuccessStatusController {
    @Get('/')
    public list(): IRunView[] {
        return [];
    }

    @Post('/')
    @Status(202)
    public async start(): Promise<IRunView> {
        return { id: '1' };
    }

    @Post('/created')
    @Status(201)
    @Description(201, 'Created')
    public create(): IRunView {
        return { id: '1' };
    }

    @Post('/example')
    @Status(202)
    @Example<IRunView>({ id: '1' })
    public withExample(): IRunView {
        return { id: '1' };
    }

    @Post('/errors')
    @Status(202)
    @Description(400, 'Bad request')
    public withError(): IRunView {
        return { id: '1' };
    }

    @Delete('/')
    @Status(202)
    public remove(): void {
        // accepted, nothing to return
    }
}
