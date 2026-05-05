/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ConfigErrorCode = {
    TSCONFIG_MALFORMED: 'CONFIG_TSCONFIG_MALFORMED',
    PRESET_MISSING: 'CONFIG_PRESET_MISSING',
} as const;
export type ConfigErrorCode = typeof ConfigErrorCode[keyof typeof ConfigErrorCode];
