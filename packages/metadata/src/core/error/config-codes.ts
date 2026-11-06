/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const ConfigErrorCode = {
    TSCONFIG_MALFORMED: 'CONFIG_TSCONFIG_MALFORMED',
    PRESET_NOT_FOUND: 'CONFIG_PRESET_NOT_FOUND',
    PRESET_MISSING: 'CONFIG_PRESET_MISSING',
} as const;

// eslint-disable-next-line @tada5hi/type-declaration-location -- Preserve the merged public value and type.
export type ConfigErrorCode = typeof ConfigErrorCode[keyof typeof ConfigErrorCode];
