/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import Ajv from 'ajv-draft-04';
import type { ValidateFunction } from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let v2Validate: ValidateFunction | undefined;
let v3Validate: ValidateFunction | undefined;

function compileSchema(filename: string): ValidateFunction {
    const schemaPath = join(currentDir, '..', 'schemas', filename);
    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

    const ajv = new Ajv({
        allErrors: true,
        strict: false,
    });
    addFormats(ajv);

    return ajv.compile(schema);
}

export type ValidationResult = {
    valid: boolean;
    errors: string[];
};

function formatErrors(validate: ValidateFunction): string[] {
    if (!validate.errors) {
        return [];
    }

    return validate.errors.map((e) => `${e.instancePath || '/'}: ${e.message}`);
}

export function validateV2Spec(spec: unknown): ValidationResult {
    if (!v2Validate) {
        v2Validate = compileSchema('v2.0-schema.json');
    }

    const valid = v2Validate(spec);

    return {
        valid: !!valid,
        errors: formatErrors(v2Validate),
    };
}

export function validateV3Spec(spec: unknown): ValidationResult {
    if (!v3Validate) {
        v3Validate = compileSchema('v3.0-schema.json');
    }

    const valid = v3Validate(spec);

    return {
        valid: !!valid,
        errors: formatErrors(v3Validate),
    };
}
