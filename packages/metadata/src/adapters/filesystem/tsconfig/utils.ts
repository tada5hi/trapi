/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import process from 'node:process';
import type { CompilerOptions, Diagnostic } from 'typescript';
import { ts } from '../../../core/compiler';
import { ConfigError } from '../../../core/error/config';
import { ConfigErrorCode } from '../../../core/error/config-codes';
import type { TsCompilerOptions } from './types';

// "Argument for '--<option>' option must be: …" — a raw value outside the
// option's allowed set. Every other conversion diagnostic means the value is
// not raw JSON (parsed enum, internal option such as pathsBasePath).
const DIAGNOSTIC_INVALID_OPTION_VALUE = 6046;

// parsed `lib` entries are file names (`lib.es2022.d.ts`), raw ones are not (`ES2022`)
const PARSED_LIB_PATTERN = /^lib\..+\.d\.ts$/i;

function throwInvalidValue(key: string, value: unknown) : never {
    throw new ConfigError({
        message: `The compiler option '${key}' has an invalid value: ${JSON.stringify(value)}.`,
        code: ConfigErrorCode.TSCONFIG_MALFORMED,
    });
}

function isInvalidValue(errors: readonly Diagnostic[]) : boolean {
    return errors.some((error) => error.code === DIAGNOSTIC_INVALID_OPTION_VALUE);
}

function normalizeLib(value: unknown[], basePath: string) : string[] {
    return value.map((entry) => {
        if (typeof entry === 'string' && PARSED_LIB_PATTERN.test(entry)) {
            return entry;
        }

        const { options, errors } = ts.convertCompilerOptionsFromJson({ lib: [entry] }, basePath);
        const [converted] = options.lib || [];
        if (errors.length > 0 || typeof converted !== 'string') {
            throwInvalidValue('lib', entry);
        }

        return converted;
    });
}

/**
 * Convert raw tsconfig-style options (`target: 'ES2022'`) to their parsed
 * form, key by key. A value that is not raw JSON — because it already is
 * parsed (`target: 9`) or is internal (`pathsBasePath`) — is kept as given,
 * so parsed, raw and mixed input all work. `lib` is handled per entry.
 *
 * @throws ConfigError when a raw value is not allowed for its option.
 */
export function normalizeCompilerOptions(
    input: TsCompilerOptions = {},
    basePath: string = process.cwd(),
) : CompilerOptions {
    const output : CompilerOptions = {};

    const keys = Object.keys(input);
    for (const key of keys) {
        const value = input[key];

        if (key === 'lib' && Array.isArray(value)) {
            output.lib = normalizeLib(value, basePath);
            continue;
        }

        const { options, errors } = ts.convertCompilerOptionsFromJson({ [key]: value }, basePath);
        if (errors.length === 0 && key in options) {
            output[key] = options[key];
            continue;
        }

        if (isInvalidValue(errors)) {
            throwInvalidValue(key, value);
        }

        output[key] = value as CompilerOptions[string];
    }

    return output;
}
