/*
 * Copyright (c) 2021-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ParameterDeclaration, PropertyDeclaration, PropertySignature, TypeAliasDeclaration,
} from 'typescript';
import type { Validator } from './type';
import { getJSDocTags, transformJSDocComment } from '../js-doc';
import { ValidatorName } from './constants';

export function getDeclarationValidators(
    declaration: PropertyDeclaration | TypeAliasDeclaration | PropertySignature | ParameterDeclaration,
    name?: string,
): Record<string, Validator> {
    if (!declaration.parent) {
        return {};
    }

    const getCommentValue = (comment?: string) => comment && comment.split(' ')[0];

    const parameterTags = getSupportedParameterTags();
    const tags = getJSDocTags(declaration.parent, (tag) => {
        const { comment } = tag;
        const text : string = transformJSDocComment(comment);
        if (!comment) {
            return false;
        }

        const commentValue = getCommentValue(text);

        return parameterTags.some((value) => {
            if (value !== tag.tagName.text) {
                return false;
            }

            return !(name && name !== commentValue);
        });
    });

    function getErrorMsg(comment?: string, isValue = true) : string {
        if (!comment) {
            return undefined;
        }
        if (isValue) {
            const indexOf = comment.indexOf(' ');
            if (indexOf > 0) {
                return comment.substring(indexOf + 1);
            }
            return undefined;
        }

        return comment;
    }

    const validators : Record<string, Validator> = {};

    for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];

        if (!tag.comment) {
            continue;
        }

        const name = tag.tagName.text;

        let comment = transformJSDocComment(tag.comment);
        comment = comment.substring(comment.indexOf(' ') + 1).trim();

        const value = getCommentValue(comment);

        switch (name) {
            case ValidatorName.UNIQUE_ITEMS:
                validators[name] = {
                    message: getErrorMsg(comment, false),
                    value: undefined,
                };
                break;
            case ValidatorName.MINIMUM:
            case ValidatorName.MAXIMUM:
            case ValidatorName.MIN_ITEMS:
            case ValidatorName.MAX_ITEMS:
            case ValidatorName.MIN_LENGTH:
            case ValidatorName.MAX_LENGTH:
                if (Number.isNaN(value)) {
                    throw new Error(`${name} parameter use number.`);
                }
                validators[name] = {
                    message: getErrorMsg(comment),
                    value: Number(value),
                };
                break;
            case ValidatorName.MIN_DATE:
            case ValidatorName.MAX_DATE:
                if (typeof value !== 'string') {
                    throw new Error(`${name} parameter use date format ISO 8601 ex. 2017-05-14, 2017-05-14T05:18Z`);
                }

                validators[name] = {
                    message: getErrorMsg(comment),
                    value,
                };
                break;
            case ValidatorName.PATTERN:
                if (typeof value !== 'string') {
                    throw new Error(`${name} parameter use string.`);
                }

                validators[name] = {
                    message: getErrorMsg(comment),
                    value: removeSurroundingQuotes(value),
                };
                break;
            default:
                if (name.toLowerCase().startsWith('is')) {
                    const errorMsg = getErrorMsg(comment, false);
                    if (errorMsg) {
                        validators[name] = {
                            message: errorMsg,
                            value: undefined,
                        };
                    }
                }
                break;
        }
    }

    return validators;
}

function getSupportedParameterTags() {
    return [
        'isString',
        'isBoolean',
        'isInt',
        'isLong',
        'isFloat',
        'isDouble',
        'isDate',
        'isDateTime',

        'minItems',
        'maxItems',
        'uniqueItems',
        'minLength',
        'maxLength',
        'pattern',
        'minimum',
        'maximum',
        'minDate',
        'maxDate',
    ];
}

function removeSurroundingQuotes(str: string) {
    if (str.startsWith('`') && str.endsWith('`')) {
        return str.substring(1, str.length - 1);
    }
    if (str.startsWith('```') && str.endsWith('```')) {
        return str.substring(3, str.length - 3);
    }
    return str;
}
