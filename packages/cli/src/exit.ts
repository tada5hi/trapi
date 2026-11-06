import type { Logger } from './types';
/* eslint-disable unicorn/prefer-error-is-error -- Keep compatibility with the published Node.js runtime requirement. */
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import { CLIUserError } from './logger.ts';

export const ExitCode = {
    Success: 0,
    UserError: 1,
    InternalError: 2,
} as const;

export async function runWithExitCode(
    logger: Logger,
    fn: () => Promise<void>,
): Promise<void> {
    try {
        await fn();
        process.exit(ExitCode.Success);
    } catch (err) {
        if (err instanceof CLIUserError) {
            logger.error(err.message);
            process.exit(ExitCode.UserError);
        }

        if ((err instanceof Error)) {
            logger.error(err.stack ?? err.message);
        } else {
            logger.error(String(err));
        }

        process.exit(ExitCode.InternalError);
    }
}

// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public value and type.
export type ExitCode = typeof ExitCode[keyof typeof ExitCode];
