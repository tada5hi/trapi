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
const metadata = require('@trapi/metadata');

(async () => {
    const output = await metadata.generateMetadata({
        entryPoint: [{ pattern: './test/data/preset/typescript-rest/api.ts', cwd: path.join(process.cwd(), '..', 'metadata') }],
        cache: false,
        preset: '@trapi/decorators',
    });

    await fs.promises.writeFile(
        path.resolve('./test/data/metadata.json'),
        JSON.stringify(output, null, 4),
    );
})();
