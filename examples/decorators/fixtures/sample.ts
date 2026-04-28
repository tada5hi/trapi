import {
    Body,
    Controller,
    Get,
    Path,
    Post,
    Query,
} from '../src/decorators';

type User = {
    id: number;
    name: string;
};

type CreateUser = {
    name: string;
};

@Controller('/users')
export class UsersController {
    @Get()
    list(@Query('search') search: string): User[] {
        return [{ id: 1, name: search }];
    }

    @Get('/:id')
    get(@Path('id') id: number): User {
        return { id, name: 'Ada' };
    }

    @Post()
    create(@Body() body: CreateUser): User {
        return { id: 1, name: body.name };
    }
}
