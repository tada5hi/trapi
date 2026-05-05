/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Type } from '../resolver/types';
import type {
    DecoratorArgument,
    DecoratorHost,
    DecoratorTypeArgument,
    HandlerContext,
} from './types';

/**
 * Build a literal-kind {@link DecoratorArgument} from a primitive value.
 * Use this in unit tests to feed handlers a mock argument:
 *
 * ```ts
 * const ctx = createHandlerContext({ args: [literalArg('users')] });
 * controllerHandler.apply(ctx, draft);
 * ```
 */
export function literalArg(raw: string | number | boolean | null): DecoratorArgument {
    return { kind: 'literal', raw };
}

/**
 * Build an identifier-kind {@link DecoratorArgument} (e.g. `@Foo(SOME_CONSTANT)`).
 * `raw` is the resolved value the identifier points to — typically a string.
 */
export function identifierArg(raw: unknown): DecoratorArgument {
    return { kind: 'identifier', raw };
}

/**
 * Build an array-kind {@link DecoratorArgument} (e.g. `@Foo(['a', 'b'])`).
 */
export function arrayArg(raw: unknown[]): DecoratorArgument {
    return { kind: 'array', raw };
}

/**
 * Build an object-kind {@link DecoratorArgument} (e.g. `@Foo({ key: 'value' })`).
 */
export function objectArg(raw: Record<string, unknown>): DecoratorArgument {
    return { kind: 'object', raw };
}

/**
 * Build an unresolvable-kind {@link DecoratorArgument} — represents arguments
 * the source extractor couldn't statically evaluate (e.g. function calls,
 * unknown identifiers).
 */
export function unresolvableArg(): DecoratorArgument {
    return { kind: 'unresolvable', raw: undefined };
}

/**
 * Build a {@link DecoratorTypeArgument} stub that returns the supplied type
 * when `resolve()` is called.
 */
export function typeArg(type: Type): DecoratorTypeArgument {
    return { resolve: () => type };
}

export type CreateHandlerContextInput = {
    args?: DecoratorArgument[];
    typeArgs?: DecoratorTypeArgument[];
    host?: DecoratorHost;
    parameterType?: Type;
};

/**
 * Construct a {@link HandlerContext} for unit-testing handlers in isolation
 * without spinning up the full TypeScript compiler / `generateMetadata`
 * pipeline. Combine with the `*Arg(...)` builders to feed a handler a
 * controlled mock decorator source.
 *
 * ```ts
 * const ctx = createHandlerContext({ args: [literalArg('users')] });
 * const draft = newControllerDraft({ name: 'UserController', location: '/x.ts' });
 * myHandler.apply(ctx, draft);
 * expect(draft.paths).toEqual(['users']);
 * ```
 */
export function createHandlerContext(input: CreateHandlerContextInput = {}): HandlerContext {
    const args = input.args ?? [];
    const typeArgs = input.typeArgs ?? [];
    return {
        host: input.host ?? { name: 'TestHost' },
        argument: (index) => args[index],
        arguments: () => [...args],
        typeArgument: (index) => typeArgs[index],
        typeArguments: () => [...typeArgs],
        parameterType: () => input.parameterType,
    };
}
