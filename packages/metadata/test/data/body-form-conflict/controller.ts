/*
 * Isolated fixture: `@BodyProp` beside a `@File` upload. `buildParameters` must
 * reject this with GENERATOR_BODY_FORM_CONFLICT, so it cannot live in
 * `test/data/controllers/` — that glob is loaded wholesale by a dozen specs and
 * every one of them would fail in `beforeAll`.
 */

import {
    BodyProp,
    Controller,
    File,
    Post,
} from '../_stubs';

@Controller('/uploads')
export class BodyPropFormConflictController {
    @Post('/body-prop-and-file')
    public bodyPropAndFile(
        @BodyProp('title') title: string,
        @File('avatar') avatar: Buffer,
    ): string {
        return title;
    }
}
