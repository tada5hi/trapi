/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('node:fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const process = require('node:process');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const metadata = require('@trapi/metadata');

(async () => {
    const output = await metadata.generateMetadata({
        entryPoint: [{
            cwd: path.join(process.cwd(), '..', 'decorators'),
            pattern: './test/data/controllers/**/*.ts',
        }],
        cache: false,
        preset: '@trapi/decorators',
    });

    const args = process.argv.splice(2);
    if (args[0] === 'shared') {
        await fs.promises.writeFile(
            path.join(process.cwd(), '..', 'swagger', 'test', 'data', 'metadata.json'),
            JSON.stringify(output, null, 2),
        );
    }

    await fs.promises.writeFile(
        path.join(process.cwd(), 'writable', 'metadata.json'),
        JSON.stringify(output, null, 2),
    );
})();
