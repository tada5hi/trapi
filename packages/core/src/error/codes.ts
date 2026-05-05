/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const CoreErrorCode = {
    PRESET_NOT_FOUND: 'CORE_PRESET_NOT_FOUND',
    PRESET_CYCLE: 'CORE_PRESET_CYCLE',
    PRESET_REPLACES_NO_MATCH: 'CORE_PRESET_REPLACES_NO_MATCH',
    PRESET_INVALID: 'CORE_PRESET_INVALID',
} as const;
export type CoreErrorCode = typeof CoreErrorCode[keyof typeof CoreErrorCode];
