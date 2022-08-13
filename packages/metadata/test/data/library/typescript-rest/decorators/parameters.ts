/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function Context(...args: Array<any>) {
    return () => { };
}

export function ContextRequest(...args: Array<any>) {
    return () => { };
}

export function ContextResponse(...args: Array<any>) {
    return () => { };
}

export function ContextNext(...args: Array<any>) {
    return () => { };
}

export function ContextLanguage(...args: Array<any>) {
    return () => { };
}

export function ContextAccept(...args: Array<any>) {
    return () => { };
}

export function PathParam(name: string) {
    return (...args) => { };
}

export function FileParam(name: string) {
    return (...args) => { };
}

export function FilesParam(name: string) {
    return (...args) => { };
}

export function QueryParam(name: string) {
    return (...args) => { };
}

export function HeaderParam(name: string) {
    return (...args) => { };
}

export function CookieParam(name: string) {
    return (...args) => { };
}

export function FormParam(name: string) {
    return (...args) => { };
}

export function Param(name: string) {
    return (...args) => { };
}
