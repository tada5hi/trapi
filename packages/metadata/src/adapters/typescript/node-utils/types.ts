/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */



// eslint-disable-next-line @typescript-eslint/naming-convention -- Preserve the public name and declaration merging.
export interface NodeDecorator {
    text: string;
    arguments: any[];
    typeArguments: any[];
}
