/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { hasOwnProperty } from '../../utils';
import {
    DEFAULT_ALIAS_ID, FieldOperator, FieldsParseOptions, FieldsParseOutput, FieldsParseOutputElement,
} from './type';

// --------------------------------------------------

// --------------------------------------------------

export function buildDomainFields(
    data: Record<string, string[]> | string[],
    options?: FieldsParseOptions,
) {
    options = options ?? { defaultAlias: DEFAULT_ALIAS_ID };

    let domainFields : Record<string, string[]> = {};

    if (Array.isArray(data)) {
        domainFields[options.defaultAlias] = data;
    } else {
        domainFields = data;
    }

    return domainFields;
}

export function parseQueryFields(
    data: unknown,
    options?: FieldsParseOptions,
) : FieldsParseOutput {
    options ??= {};

    // If it is an empty array nothing is allowed
    if (
        typeof options.allowed !== 'undefined' &&
        Object.keys(options.allowed).length === 0
    ) {
        return [];
    }

    options.aliasMapping ??= {};
    options.relations ??= [];
    options.defaultAlias ??= DEFAULT_ALIAS_ID;

    let allowedDomainFields : Record<string, string[]> | undefined;
    if (options.allowed) {
        allowedDomainFields = buildDomainFields(options.allowed, options);
    }

    const prototype: string = Object.prototype.toString.call(data);
    if (
        prototype !== '[object Object]' &&
        prototype !== '[object Array]' &&
        prototype !== '[object String]'
    ) {
        return [];
    }

    if (prototype === '[object String]') {
        data = { [options.defaultAlias]: data };
    }

    if (prototype === '[object Array]') {
        data = { [options.defaultAlias]: data };
    }

    let transformed : FieldsParseOutput = [];

    for (const alias in (data as Record<string, string[] | string>)) {
        if (!data.hasOwnProperty(alias) || typeof alias !== 'string') {
            continue;
        }

        const fieldsArr : string[] = buildArrayFieldsRepresentation((data as Record<string, string[]>)[alias]);
        if (fieldsArr.length === 0) continue;

        let fields : FieldsParseOutputElement[] = [];

        for (let i = 0; i < fieldsArr.length; i++) {
            let operator: FieldOperator | undefined;

            switch (true) {
                case fieldsArr[i].substr(0, 1) === FieldOperator.INCLUDE:
                    operator = FieldOperator.INCLUDE;
                    break;
                case fieldsArr[i].substr(0, 1) === FieldOperator.EXCLUDE:
                    operator = FieldOperator.EXCLUDE;
                    break;
            }

            if (operator) fieldsArr[i] = fieldsArr[i].substr(1);

            fields.push({
                key: fieldsArr[i],
                ...(operator ? { value: operator } : {}),
            });
        }

        const allowedDomains : string[] = typeof allowedDomainFields !== 'undefined' ? Object.keys(allowedDomainFields) : [];
        const targetKey : string = allowedDomains.length === 1 ? allowedDomains[0] : alias;

        // is not default domain && includes are defined?
        if (
            alias !== DEFAULT_ALIAS_ID &&
            alias !== options.defaultAlias &&
            typeof options.relations !== 'undefined'
        ) {
            const includesMatched = options.relations.filter((include) => include.value === alias);
            if (includesMatched.length === 0) {
                continue;
            }
        }

        fields = fields
            .map((field) => {
                const fullKey = `${alias}.${field.key}`;

                return {
                    ...(targetKey && targetKey !== DEFAULT_ALIAS_ID ? { alias: targetKey } : {}),
                    ...field,
                    key: options.aliasMapping.hasOwnProperty(fullKey) ? options.aliasMapping[fullKey].split('.').pop() : field.key,
                };
            })
            .filter((field) => {
                if (typeof allowedDomainFields === 'undefined') {
                    return true;
                }

                return hasOwnProperty(allowedDomainFields, targetKey) &&
                    allowedDomainFields[targetKey].indexOf(field.key) !== -1;
            });

        if (fields.length > 0) {
            transformed = [...transformed, ...fields];
        }
    }

    const keys : string[] = Object.keys(transformed);

    if (keys.length === 1) {
        if (keys[0] === DEFAULT_ALIAS_ID) {
            return transformed[keys[0]];
        }
    }

    return transformed;
}

function buildArrayFieldsRepresentation(data: unknown) : string[] {
    const valuePrototype : string = Object.prototype.toString.call(data);
    if (
        valuePrototype !== '[object Array]' &&
        valuePrototype !== '[object String]'
    ) {
        return [];
    }

    let fieldsArr : string[] = [];

    /* istanbul ignore next */
    if (valuePrototype === '[object String]') {
        fieldsArr = (data as string).split(',');
    }

    /* istanbul ignore next */
    if (valuePrototype === '[object Array]') {
        fieldsArr = (data as unknown[])
            .filter((val) => typeof val === 'string') as string[];
    }

    return fieldsArr;
}
