/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getModuleExport, load } from 'locter';
import type { DecoratorConfig } from '../../type';
import { isPresetSchema } from './check';
import { generatePresetLookupPaths } from './normalize';

export async function loadPreset(input: string) : Promise<DecoratorConfig[]> {
    const items : DecoratorConfig[] = [];

    const lookupPaths = generatePresetLookupPaths(input);
    let allFailed = true;

    for (let i = 0; i < lookupPaths.length; i++) {
        try {
            const { value: content } = getModuleExport(await load(lookupPaths[i]));

            if (isPresetSchema(content)) {
                items.push(...content.items);

                const extendsPromises : Promise<DecoratorConfig[]>[] = [];

                if (content.extends) {
                    for (let j = 0; j < content.extends.length; j++) {
                        extendsPromises.push(loadPreset(content.extends[j]));
                    }
                }

                const output = await Promise.all(extendsPromises);
                for (let j = 0; j < output.length; j++) {
                    items.push(...output[j]);
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
