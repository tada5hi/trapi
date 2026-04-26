import {
    FromBody,
    FromQuery,
    FromRoute,
    HttpGet,
    HttpPost,
    Route,
    Tags,
} from '../src/decorators';

type User = {
    id: number;
    name: string;
};

type CreateUser = {
    name: string;
};

@Route('/users')
@Tags('users')
export class UsersController {
    @HttpGet()
    list(@FromQuery('search') search: string): User[] {
        return [{ id: 1, name: search }];
    }

    @HttpGet('/:id')
    get(@FromRoute('id') id: number): User {
        return { id, name: 'Ada' };
    }

    @HttpPost()
    create(@FromBody() body: CreateUser): User {
        return { id: 1, name: body.name };
    }
}
