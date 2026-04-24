/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ServerOption, SpecGeneratorOptions, SpecGeneratorOptionsInput } from './types';

export function buildSpecGeneratorOptions(input: SpecGeneratorOptionsInput) : SpecGeneratorOptions {
    const servers : ServerOption[] = [];
    if (input.servers) {
        if (Array.isArray(input.servers)) {
            for (let i = 0; i < input.servers.length; i++) {
                const server = input.servers[i];
                if (typeof server === 'string') {
                    servers.push({ url: server });
                } else {
                    servers.push(server);
                }
            }
        } else if (typeof input.servers === 'string') {
            servers.push({ url: input.servers });
        } else {
            servers.push(input.servers);
        }
    }

    return {
        ...input,
        servers,
    };
}
