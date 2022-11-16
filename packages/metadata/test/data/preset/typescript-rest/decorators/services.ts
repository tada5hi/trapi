/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export function Path(path: string) {
    return (...args) => { };
}

export function Security(roles?: string | Array<string>, name?: string) {
    return (...args) => { };
}

export function PreProcessor<T>(preprocessor: T) {
    return () => { };
}

export function PostProcessor<T>(preprocessor: T) {
    return () => { };
}

export function AcceptLanguage(...languages: Array<string>) {
    return () => { };
}

export function Accept(...accepts: Array<string>) {
    return (...args) => { };
}

export function BodyOptions(options: any) {
    return () => { };
}

export function BodyType<T>(type: T) {
    return () => { };
}

export function IgnoreNextMiddlewares(...args: Array<any>) {
    return () => { };
}

// like SWAGGER_HIDDEN
export function Abstract(...args: Array<any>) {
    return () => { };
}
