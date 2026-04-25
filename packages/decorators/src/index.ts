/*
 * Copyright (c) 2023-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { schema } from './module';

export * from './decorators';
export * from './module';
export * from './preset';

// Default export remains the v1 schema until generateMetadata is migrated to v2 (Phase 3).
// The v2 preset is exported by name as `preset` and will become the default at cutover.
export default schema;
