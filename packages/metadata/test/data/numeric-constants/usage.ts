/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HttpStatus, IMPORTED_CONFLICT, STATUS } from './constants';

declare function Status(value: number): void;

const LOCAL_CONFLICT = 409;

// One call per numeric-constant shape, in the order the spec reads them.
Status(LOCAL_CONFLICT);
Status(IMPORTED_CONFLICT);
Status(HttpStatus.Conflict);
Status(STATUS.CONFLICT);
