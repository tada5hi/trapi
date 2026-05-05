/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// This fixture intentionally throws at module-evaluation time so that
// resolvePresetByName can be tested for surfacing real load failures
// (instead of misreporting them as PRESET_NOT_FOUND).
throw new Error('intentional preset evaluation failure');

export const preset = { name: 'unreachable' };
