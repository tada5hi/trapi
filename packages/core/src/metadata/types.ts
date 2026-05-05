/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Controller } from '../controller/types';
import type { ReferenceTypes } from '../resolver/types';

/**
 * The output specification for metadata generation.
 *
 * `Metadata` is the framework-neutral wrapper around extracted controllers and
 * reference types. Producers other than `@trapi/metadata` (e.g. Babel-based
 * extractors, runtime-decorator inspectors, or hand-written fixtures) can
 * build a `Metadata` value directly and feed it to `@trapi/swagger` without
 * pulling in the TypeScript compiler.
 */
export type Metadata = {
    /**
     * A Controller is a collection of grouped methods (GET, POST, ...) for a
     * common URL prefix or set of prefixes (`@Controller(['/roles', '/realms/:id/roles'])`).
     */
    controllers: Controller[];
    /**
     * The reference types collected during extraction (interfaces, classes,
     * enums, type aliases) keyed by their stable reference name.
     */
    referenceTypes: ReferenceTypes;
};
