/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import AjvDraft04 from 'ajv-draft-04';
import Ajv2020 from 'ajv/dist/2020.js';
import type { ValidateFunction } from 'ajv-draft-04';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const currentDir = fileURLToPath(new URL('.', import.meta.url));

let v2Validate: ValidateFunction | undefined;
let v3Validate: ValidateFunction | undefined;
let v31Validate: ValidateFunction | undefined;

function loadSchema(filename: string): object {
    const schemaPath = join(currentDir, '..', 'schemas', filename);
    return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

function compileDraft04Schema(filename: string): ValidateFunction {
    const schema = loadSchema(filename);
    const ajv = new AjvDraft04({ allErrors: true, strict: false });
    addFormats(ajv);
    return ajv.compile(schema);
}

function compileDraft2020Schema(filename: string): ValidateFunction {
    const schema = loadSchema(filename);
    const ajv = new Ajv2020({ allErrors: true, strict: false });
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
        v2Validate = compileDraft04Schema('v2.0-schema.json');
    }

    const valid = v2Validate(spec);
    return { valid: !!valid, errors: formatErrors(v2Validate) };
}

export function validateV3Spec(spec: unknown): ValidationResult {
    if (!v3Validate) {
        v3Validate = compileDraft04Schema('v3.0-schema.json');
    }

    const valid = v3Validate(spec);
    return { valid: !!valid, errors: formatErrors(v3Validate) };
}

// Schema Object locations where unevaluatedProperties errors are expected
// because the OAI 3.1 schema intentionally skips JSON Schema content validation.
const SCHEMA_OBJECT_PATTERNS = [
    '/components/schemas/',
    '/content/',
    '/schema',
    '/items',
];

function isSchemaObjectError(instancePath: string, keyword: string): boolean {
    if (keyword !== 'unevaluatedProperties' && keyword !== 'if') {
        return false;
    }

    return SCHEMA_OBJECT_PATTERNS.some((p) => instancePath.includes(p));
}

export function validateV31Spec(spec: unknown): ValidationResult {
    if (!v31Validate) {
        v31Validate = compileDraft2020Schema('v3.1-schema.json');
    }

    v31Validate(spec);

    if (!v31Validate.errors) {
        return { valid: true, errors: [] };
    }

    // Filter out errors from Schema Object locations where the OAI 3.1 schema
    // intentionally skips JSON Schema content validation.
    // Also filter cascading "else" errors caused by those suppressions.
    const schemaErrorPaths = new Set<string>();
    for (const err of v31Validate.errors) {
        if (isSchemaObjectError(err.instancePath || '', err.keyword)) {
            schemaErrorPaths.add(err.instancePath || '');
        }
    }

    const filtered = v31Validate.errors.filter((err) => {
        const path = err.instancePath || '';
        // Suppress schema object errors
        if (isSchemaObjectError(path, err.keyword)) {
            return false;
        }
        // Suppress cascading "else" errors whose parent was a schema object error
        if (err.keyword === 'if' || err.message?.includes('must match "else" schema')) {
            for (const schemaPath of schemaErrorPaths) {
                if (path.startsWith(schemaPath) || schemaPath.startsWith(path)) {
                    return false;
                }
            }
        }
        return true;
    });

    const errors = filtered.map((e) => `${e.instancePath || '/'}: ${e.message}`);
    return { valid: errors.length === 0, errors };
}
