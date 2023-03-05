/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty, loadSync } from 'locter';
import type { DecoratorConfig } from '../../type';
import { isPresetSchema } from './check';
import { generatePresetLookupPaths } from './normalize';

export function loadPreset(input: string) : DecoratorConfig[] {
    const items : DecoratorConfig[] = [];

    const lookupPaths = generatePresetLookupPaths(input);
    let allFailed = true;

    for (let i = 0; i < lookupPaths.length; i++) {
        try {
            let content = loadSync(lookupPaths[i]);
            if (hasOwnProperty(content, 'default')) {
                content = content.default;
            }

            if (isPresetSchema(content)) {
                items.push(...content.items);

                if (content.extends) {
                    for (let j = 0; j < content.extends.length; j++) {
                        items.push(...loadPreset(content.extends[j]));
                    }
                }
            }

            allFailed = false;
        } catch (e) {
            // do nothing ...
        }
    }

    if (allFailed) {
        throw new Error(`The preset ${input} could not be resolved.`);
    }

    return items;
}
