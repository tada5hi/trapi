/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * A decorator to document the responses that a given service method can return. It is used to generate
 * documentation for the REST service.
 * ```typescript
 * interface MyError {
 *    message: string
 * }
 * @ Path('people')
 * class PeopleService {
 *   @ Description<string>(200, 'Retrieve a list of people.')
 *   @ Description<MyError>(401, 'The user is unauthorized.', {message: 'The user is not authorized to access this operation.'})
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
export function Description<T>(name: string | number, description?: string, example?: T): any {
    return () => { };
}
