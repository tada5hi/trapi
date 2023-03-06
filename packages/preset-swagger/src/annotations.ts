/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Document the method or class consumes property in generated swagger docs
 */
export function RequestConsumes(...values: Array<string | string[]>): any {
    return () => { };
}

/**
 *
 *
 *
 * @param key
 * @constructor
 */
export function RequestFileParam(key: string) : any {
    return () => { };
}

/**
 * A decorator to document the responses that a given service method can return. It is used to generate
 * documentation for the REST service.
 * ```typescript
 * interface MyError {
 *    message: string
 * }
 * @ Path('people')
 * class PeopleService {
 *   @ ResponseDescription<string>(200, 'Retrieve a list of people.')
 *   @ ResponseDescription<MyError>(401, 'The user is unauthorized.', {message: 'The user is not authorized to access this operation.'})
 *   @ GET
 *   getPeople(@ Param('name') name: string) {
 *      // ...
 *   }
 * }
 * ```
 * A Default response is created in swagger documentation from the method return analisys. So any response declared
 * through this decorator is an additional response created.
 * @param name
 * @param description A description for this response
 * @param example An optional example of response to be added to method documentation.
 */
export function ResponseDescription<T>(name: string | number, description?: string, example?: T): any {
    return () => { };
}

/**
 * Used to provide an example of method return to be added into the method response section of the
 * generated documentation for this method.
 * ```typescript
 * @ Path('people')
 * class PeopleService {
 *   @ ResponseExample<Array<Person>>([{
 *     name: 'Joe'
 *   }])
 *   @ GET
 *   getPeople(@ Param('name') name: string): Person[] {
 *      // ...
 *   }
 * }
 * ```
 * @param example The example returned object
 */
export function ResponseExample<T>(example: T): any {
    return () => { };
}

/**
 * Document the method or class produces property in generated swagger docs
 */
export function ResponseProduces(...values: string[]): any {
    return () => { };
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
export function SwaggerTags(...values: string[]): any {
    return () => { };
}

/**
 * Document the method or class produces property in generated swagger docs.
 */
export function SwaggerHidden(): any {
    return () => { };
}

/**
 * Document the method or collection of method paths are deprecated and should not be used.
 */
export function SwaggerDeprecated() : any {
    return () => { };
}

/**
 * Document the type of property or parameter as `integer ($int32)` in generated swagger docs
 */
export function IsInt(target: any, propertyKey: string, parameterIndex?: number) {

}

/**
 * Document the type of property or parameter as `integer ($int64)` in generated swagger docs
 */
export function IsLong(target: any, propertyKey: string, parameterIndex?: number) {

}

/**
 * Document the type of property or parameter as `number ($float)` in generated swagger docs
 */
export function IsFloat(target: any, propertyKey: string, parameterIndex?: number) {

}

/**
 * Document the type of property or parameter as `number ($double)` in generated swagger docs.
 * This is the default for `number` types without a specifying decorator.
 */
export function IsDouble(target: any, propertyKey: string, parameterIndex?: number) {

}
