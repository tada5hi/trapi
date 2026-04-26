#!/usr/bin/env node

/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { runMain } from 'citty';
import { createCLIEntryPointCommand } from './module.ts';

Promise.resolve()
    .then(() => createCLIEntryPointCommand())
    .then((command) => runMain(command))
    .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
        process.exit(1);
    });
