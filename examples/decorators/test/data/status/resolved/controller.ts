import { Controller, Description, Get } from '../../../../src/decorators';

enum HttpStatus {
    Created = 201,
}

const NOT_FOUND = 404;

@Controller('/statuses')
export class StatusController {
    @Get('/created')
    @Description(HttpStatus.Created, 'Created')
    created(): string {
        return '';
    }

    @Get('/missing')
    @Description(NOT_FOUND, 'Not found')
    missing(): string {
        return '';
    }
}
