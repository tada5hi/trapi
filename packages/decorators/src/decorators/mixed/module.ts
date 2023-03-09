/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Document the method or collection of method paths are deprecated and should not be used.
 */
export function Deprecated() : any {
    return () => { };
}

/**
 * @Extension('key', 'value')
 * class ExtensionController {
 *
 * }
 *
 * @param key
 * @param value
 * @constructor
 */
export function Extension(key: string, value: unknown) {
    return (...args) => {};
}

/**
 * @Hidden()
 * class HiddenController {
 *
 * }
 *
 * DDocument the method or class should be used.
 */
export function Hidden(): any {
    return () => { };
}

/**
 *
 * @Security(['scope', 'scope'])
 * class SecurityController {
 *
 * }
 *
 * @param roles
 * @param name
 * @constructor
 */
export function Security(roles?: string | Array<string>, name?: string) {
    return (...args) => { };
}

/**
 * Add tags for a given method on generated swagger documentation.
 * ```typescript
 * @ Path('people')
 * class PeopleService {
 *   @ SwaggerTags('adiministrative', 'department1')
 *   @ GET
 *   getPeople(@ Param('name') name: string) {
 *      // ...
 *   }
 * }
 * ```
 * @param values a list of tags
 */
export function Tags(...values: string[]): any {
    return () => { };
}
