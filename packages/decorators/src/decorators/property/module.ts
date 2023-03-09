/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Document the type of property or parameter as `number ($double)` in generated swagger docs.
 * This is the default for `number` types without a specifying decorator.
 */
export function IsDouble(target: any, propertyKey: string, parameterIndex?: number) {

}

/**
 * Document the type of property or parameter as `number ($float)` in generated swagger docs
 */
export function IsFloat(target: any, propertyKey: string, parameterIndex?: number) {

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
