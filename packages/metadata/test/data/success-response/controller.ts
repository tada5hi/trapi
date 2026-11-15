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
    Respond,
    Status,
    SuccessProduces,
} from '../_stubs';

interface IReport {
    id: string;
}

@Controller('/reports')
export class SuccessResponseController {
    @Get('/plain')
    public plain(): IReport {
        return { id: '1' };
    }

    @Get('/void')
    public voided(): void {
        // nothing to return
    }

    @Get('/pdf')
    @SuccessProduces('application/pdf')
    public pdf(): IReport {
        return { id: '1' };
    }

    @Post('/created')
    @Status(201)
    @SuccessProduces('application/pdf')
    public created(): IReport {
        return { id: '1' };
    }

    @Post('/respond')
    @Status(201)
    @Respond(201, 'Report created')
    @SuccessProduces('application/pdf')
    public respondWithout(): IReport {
        return { id: '1' };
    }

    @Post('/respond-own')
    @Status(201)
    @Respond(201, 'Report created', ['text/csv'])
    @SuccessProduces('application/pdf')
    public respondWithOwn(): IReport {
        return { id: '1' };
    }

    @Get('/respond-twice')
    @Description<string>(200, 'First')
    @Description<string>(200, 'Second')
    @SuccessProduces('application/pdf')
    public respondTwice(): IReport {
        return { id: '1' };
    }

    @Post('/declared-twice')
    @Status(201)
    @Respond(201, 'First')
    @Respond(201, 'Second')
    @Example({ id: '1' })
    public declaredTwice(): IReport {
        return { id: '1' };
    }

    @Delete('/void-produces')
    @SuccessProduces('application/pdf')
    public voidProduces(): void {
        // nothing to return
    }

    @Delete('/no-content-produces')
    @Status(204)
    @SuccessProduces('application/pdf')
    public noContentProduces(): IReport {
        return { id: '1' };
    }

    @Delete('/null')
    @Status(204)
    public async nullNoContent(): Promise<null> {
        return null;
    }

    @Post('/reset')
    @Status(205)
    public reset(): IReport {
        return { id: '1' };
    }

    @Get('/not-modified')
    @Status(304)
    public notModified(): IReport {
        return { id: '1' };
    }

    @Post('/accepted')
    @Status(202)
    public accepted(): IReport {
        return { id: '1' };
    }

    @Post('/unknown')
    @Status(299)
    public unknown(): IReport {
        return { id: '1' };
    }

    @Post('/teapot')
    @Status(418)
    public teapot(): IReport {
        return { id: '1' };
    }

    @Post('/not-extended')
    @Status(510)
    public notExtended(): IReport {
        return { id: '1' };
    }

    @Get('/void-with-schema')
    @Status(200)
    @Description<string>(200, 'Pdf')
    @SuccessProduces('application/pdf')
    public voidWithSchema(): void {
        // the handler response documents the body
    }

    @Get('/void-schemaless')
    @Status(200)
    @Description(200, 'Pdf')
    @SuccessProduces('application/pdf')
    public voidSchemaless(): void {
        // nothing documents a body
    }

    @Delete('/no-content-with-schema')
    @Status(204)
    @Description<string>(204, 'Gone')
    @SuccessProduces('application/pdf')
    public noContentWithSchema(): void {
        // no-content status: never a body
    }

    @Get('/never')
    @SuccessProduces('application/xml')
    public neverReturns(): never {
        throw new Error('never returns');
    }

    @Get('/duplicate-produces')
    @SuccessProduces('application/pdf')
    @SuccessProduces('application/xml')
    @SuccessProduces('application/pdf')
    public duplicateProduces(): IReport {
        return { id: '1' };
    }

    @Delete('/handler-no-content')
    @Status(204)
    @Description(204, 'Deleted')
    public handlerNoContent(): IReport {
        return { id: '1' };
    }
}

export class ReportBase {
    @Get('/inherited')
    public inherited(): IReport {
        return { id: '1' };
    }
}

@Controller('/xml-reports')
@SuccessProduces('application/xml')
export class ControllerSuccessProducesController extends ReportBase {
    @Get('/xml')
    public xml(): IReport {
        return { id: '1' };
    }

    @Get('/pdf')
    @SuccessProduces('application/pdf')
    public pdf(): IReport {
        return { id: '1' };
    }

    @Delete('/void')
    public voided(): void {
        // nothing to return
    }
}
