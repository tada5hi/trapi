/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Validator = {
    value?: any,
    message?: string
};

export type Validators = Record<string, Validator>;
