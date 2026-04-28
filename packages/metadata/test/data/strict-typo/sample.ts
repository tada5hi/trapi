/*
 * Strict-mode end-to-end fixture: deliberately introduces a typo (`@Hiden`)
 * that has no matching handler in the @trapi/preset-decorators-express preset.
 */

const Controller = (_path: string): ClassDecorator => () => { /* no-op */ };
const Hiden = (): ClassDecorator => () => { /* no-op */ };
const Get = (): MethodDecorator => () => { /* no-op */ };

@Controller('/typo')
@Hiden()
export class TypoController {
    @Get()
    list(): string[] {
        return [];
    }
}
