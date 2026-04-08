/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load } from 'locter';
import type { DecoratorConfig } from '../../type';
import { isPresetSchema } from './check';
import { generatePresetLookupPaths } from './normalize';

export async function loadPreset(input: string) : Promise<DecoratorConfig[]> {
    const items : DecoratorConfig[] = [];

    const lookupPaths = generatePresetLookupPaths(input);
    let allFailed = true;

    for (const lookupPath of lookupPaths) {
        try {
            let moduleExport = await load(lookupPath);

            if (!isPresetSchema(moduleExport)) {
                if (isPresetSchema(moduleExport.default)) {
                    moduleExport = moduleExport.default;
                } else {
                    continue;
                }
            }

            items.push(...moduleExport.items);

            const extendsPromises : Promise<DecoratorConfig[]>[] = [];

            if (moduleExport.extends) {
                for (let j = 0; j < moduleExport.extends.length; j++) {
                    extendsPromises.push(loadPreset(moduleExport.extends[j]));
                }
            }

            const output = await Promise.all(extendsPromises);
            for (const element of output) {
                items.push(...element);
            }

            allFailed = false;
        } catch {
            // do nothing ...
        }
    }

    if (allFailed) {
        throw new Error(`The preset ${input} could not be resolved.`);
    }

    return items;
}
