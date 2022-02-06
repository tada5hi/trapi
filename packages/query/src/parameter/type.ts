/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;
export type OnlyScalar<T> = T extends string | number | boolean | undefined | null ? T : never;
export type OnlySingleObject<T> = T extends { [key: string]: any } ? T : never;
export type OnlyObject<T> = Flatten<T> extends OnlySingleObject<Flatten<T>> ? T | Flatten<T> : never;
export type ToOneAndMany<T> = T extends Array<infer Item> ? (Item | Item[]) : (T[] | T);
export type KeyWithOptionalPrefix<T, O extends string> = T extends string ? (`${O}${T}` | T) : never;
