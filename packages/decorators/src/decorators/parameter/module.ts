/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function PathParam(name: string) {
    return (...args) => { };
}

export function PathParams(name?: string) {

}

// ----------------------------------------

export function FileParam(name: string) {
    return (...args) => { };
}

export function FilesParam(name: string) {
    return (...args) => { };
}

// ----------------------------------------

export function Query(name?: string) {
    return (...args) => {};
}

export function QueryParam(name: string, options?: Record<string, any>) {
    return (...args) => { };
}

// ----------------------------------------

export function HeaderParam(name: string) {
    return (...args) => { };
}

// ----------------------------------------

export function CookieParam(name: string) {
    return (...args) => { };
}

// ----------------------------------------

export function FormParam(name: string) {
    return (...args) => { };
}

// ----------------------------------------

export function Param(name: string) {
    return (...args) => { };
}

// ----------------------------------------
