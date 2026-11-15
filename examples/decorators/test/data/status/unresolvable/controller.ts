import { Controller, Description, Get } from '../../../../src/decorators';

declare function computeStatus(): number;

@Controller('/statuses')
export class StatusController {
    @Get()
    @Description(computeStatus(), 'Computed')
    computed(): string {
        return '';
    }
}
