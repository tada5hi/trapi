/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Module ids probed for the classic (TypeScript <= 6) compiler API, in order.
 *
 * `typescript` covers TS 5/6 and the alias layout recommended for TS 7
 * (`"typescript": "npm:@typescript/typescript6"`). `@typescript/typescript6`
 * covers a plain `typescript@7` install next to the compat package —
 * typescript@7's main export only carries `version`.
 */
export const CompilerApiModule = {
    TYPESCRIPT: 'typescript',
    TYPESCRIPT6: '@typescript/typescript6',
} as const;
export type CompilerApiModule = typeof CompilerApiModule[keyof typeof CompilerApiModule];
