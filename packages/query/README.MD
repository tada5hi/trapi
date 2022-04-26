# @trapi/query 🌈

[![main](https://github.com/Tada5hi/trapi/actions/workflows/main.yml/badge.svg)](https://github.com/Tada5hi/trapi/actions/workflows/main.yml)
[![codecov](https://codecov.io/gh/Tada5hi/trapi/branch/main/graph/badge.svg?token=ZUJ8F5TTSX)](https://codecov.io/gh/Tada5hi/trapi)
[![Known Vulnerabilities](https://snyk.io/test/github/Tada5hi/trapi/badge.svg)](https://snyk.io/test/github/Tada5hi/trapi)
[![npm version](https://badge.fury.io/js/@trapi%2Fquery.svg)](https://badge.fury.io/js/@trapi%2Fquery)

This is a library to build efficient and optimized `JSON:API` like REST-APIs.

It extends the specification format between request- & response-handling based on the following parameters:
- `fields`
  - Description: Return only specific fields or extend the default selection.
  - URL-Parameter: **fields**
- `filters`
  - Description: Filter the data set, according to specific criteria.
  - URL-Parameter: **filter**
- `relations`
  - Description: Include related resources of the primary data.
  - URL-Parameter: **include**
- `pagination`
  - Description: Limit the number of resources returned from the entire collection.
  - URL-Parameter: **page**
- `sort`
  - Description: Sort the resources according to one or more keys in asc/desc direction.
  - URL-Parameter: **sort**

---
**Important NOTE**

The examples in the [Parsing](#parsing-) section, are not available with releases `<1.0.0` of the `typeorm-extension`  library.

---

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [Build](#build-)
  - [Parsing](#parsing-)
- [Functions](#functions)
  - [buildQuery](#buildquery)
  - [parseQuery](#parsequery)
  - [parseQueryParameter](#parsequeryparameter)
- [Types](#types)
  - [Build](#build)
    - [Options](#buildoptions)
    - [Input](#buildinput)
  - [Parse](#parse)
    - [Options](#parseoptions)
    - [Input](#parseinput)
    - [Output](#parseoutput)
  - [Parameter](#parameter)
    - [Fields](#fields)
    - [Filter[s]](#filters)
    - [Pagination/Page](#pagination)
    - [Relations/Include](#relations)
    - [Sort](#sort)

## Installation

```bash
npm install @trapi/query --save
```

## Usage

### Build 🏗

The general idea is to construct a [BuildInput](#buildinput) at the frontend side,
which will be formatted to a `string` and passed to the backend application as a URL query string.
As a result the backend application will always able to process the request.

Therefore, two components of this module are required in the frontend application:
- generic type: `BuildInput<T>`
- function: `buildQuery`.

The method will generate the query string.

In the following example a Class which will represent the structure of a `User` and a function called
`getAPIUsers`, which will handle the resource request to the resource API, will be defined.

```typescript
import axios from "axios";
import {
    buildQuery,
    BuildInput
} from "@trapi/query";

class Profile {
    id: number;
    avatar: string;
    cover: string;
}

class User {
    id: number;
    name: string;
    age?: number;
    profile: Profile;
}

type ResponsePayload = {
    data: User[],
    meta: {
        limit: number,
        offset: number,
        total: number
    }
}

export async function getAPIUsers(
    record: BuildInput<User>
): Promise<ResponsePayload> {
    const response = await axios.get('users' + buildQuery(record));

    return response.data;
}

(async () => {
    const record: BuildInput<User> = {
        pagination: {
            limit: 20,
            offset: 10
        },
        filters: {
            id: 1 // some possible values:
            // 1 | [1,2,3] | '!1' | '~1' | ['!1',2,3] | {profile: {avatar: 'xxx.jpg'}}
        },
        fields: ['id', 'name'], // some possible values:
        // 'id' | ['id', 'name'] | '+id' | {user: ['id', 'name'], profile: ['avatar']}
        sort: '-id', // some possible values:
        // 'id' | ['id', 'name'] | '-id' | {id: 'DESC', profile: {avatar: 'ASC'}}
        relations: {
            profile: true
        }
    };

    const query = buildQuery(record);

    // console.log(query);
    // ?filter[id]=1&fields=id,name&page[limit]=20&page[offset]=10&sort=-id&include=profile

    let response = await getAPIUsers(record);

    // do something with the response :)
})();
```

The next examples will demonstrate how to parse and validate the transformed `BuildInput<T>` on the backend side.

### Parsing 🔎
For explanation purposes,
two simple entities with a basic relation between them are declared to demonstrate their usage:

```typescript
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn
} from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn({unsigned: true})
    id: number;

    @Column({type: 'varchar', length: 30})
    @Index({unique: true})
    name: string;

    @Column({type: 'varchar', length: 255, default: null, nullable: true})
    email: string;

    @OneToOne(() => Profile)
    profile: Profile;
}

@Entity()
export class Profile {
    @PrimaryGeneratedColumn({unsigned: true})
    id: number;

    @Column({type: 'varchar', length: 255, default: null, nullable: true})
    avatar: string;

    @Column({type: 'varchar', length: 255, default: null, nullable: true})
    cover: string;

    @OneToOne(() => User)
    @JoinColumn()
    user: User;
}
```
In this example [typeorm](https://www.npmjs.com/package/typeorm) is used for `object-relational mapping (ORM)` and [typeorm-extension](https://www.npmjs.com/package/typeorm-extension) is used
to apply the parsed request query parameters on the db query and [express](https://www.npmjs.com/package/express) to handle requests.

#### Parse - Extended

In the following example, all query parameter parse functions (`parseQueryFields`, `parseQueryFilters`, ...)
will be imported separately.

```typescript
import {getRepository} from "typeorm";
import {Request, Response} from 'express';

import {
    parseQueryFields,
    parseQueryFilters,
    parseQueryRelations,
    parseQueryPagination,
    parseQuerySort,
    Parameter
} from "@trapi/query";

import {
    applyQueryParseOutput
} from "typeorm-extension";

/**
 * Get many users.
 *
 * Request example
 * - url: /users?page[limit]=10&page[offset]=0&include=profile&filter[id]=1&fields[user]=id,name
 *
 * Return Example:
 * {
 *     data: [
 *         {id: 1, name: 'tada5hi', profile: {avatar: 'avatar.jpg', cover: 'cover.jpg'}}
 *      ],
 *     meta: {
 *        total: 1,
 *        limit: 20,
 *        offset: 0
 *    }
 * }
 * @param req
 * @param res
 */
export async function getUsers(req: Request, res: Response) {
    const {fields, filter, include, page, sort} = req.query;

    const repository = getRepository(User);
    const query = repository.createQueryBuilder('user');

    // -----------------------------------------------------

    const relationsParsed = parseQueryRelations(include, {
        allowed: 'profile'
    });

    const fieldsParsed = parseQueryFields(fields, {
        defaultAlias: 'user',
        // profile.id can only be used as sorting key, if the relation 'profile' is included.
        allowed: ['id', 'name', 'profile.id', 'profile.avatar'],
        relations: relationsParsed
    });

    const filterParsed = parseQueryFilters(filter, {
        defaultAlias: 'user',
        // profile.id can only be used as sorting key, if the relation 'profile' is included.
        allowed: ['id', 'name', 'profile.id'],
        relations: relationsParsed
    });

    const pageParsed = parseQueryPagination(page, {
        maxLimit: 20
    });

    const sortParsed = parseQuerySort(sort, {
        defaultAlias: 'user',
        // profile.id can only be used as sorting key, if the relation 'profile' is included.
        allowed: ['id', 'name', 'profile.id'],
        relations: relationsParsed
    });

    // -----------------------------------------------------

    // group back parsed parameter back,
    // so they can applied on the db query.
    const parsed = applyQueryParseOutput(query, {
        fields: fieldsParsed,
        // only allow filtering users by id & name
        filters: filterParsed,
        relations: relationsParsed,
        // only allow to select 20 items at maximum.
        pagination: pageParsed,
        sort: sortParsed
    });

    // -----------------------------------------------------

    const [entities, total] = await query.getManyAndCount();

    return res.json({
        data: {
            data: entities,
            meta: {
                total,
                ...parsed.pagination
            }
        }
    });
}
```

#### Parse - Short
Another way is to directly import the `parseQuery` function, which will handle a group of query parameter values & options.

The [ParseInput](#parseinput) data of the `parseQuery` function can have the following (alias-) property keys, which will be formatted to [Parameter](#parameter)
keys after the parse process:
- `fields` | `Parameter.FIELDS`
- `include` | `relations` | `Parameter.RELATIONS`
- ... [more](#parseinput)

```typescript
import {getRepository} from "typeorm";
import {Request, Response} from 'express';

import {
    parseQuery,
    Parameter,
    ParseOutput
} from "@trapi/query";

import {
    applyQueryParseOutput
} from "typeorm-extension";

/**
 * Get many users.
 *
 * ...
 *
 * @param req
 * @param res
 */
export async function getUsers(req: Request, res: Response) {
    // const {fields, filter, include, page, sort} = req.query;

    const output: ParseOutput = parseQuery(req.query, {
        fields: {
            defaultAlias: 'user',
            allowed: ['id', 'name', 'profile.id', 'profile.avatar']
        },
        filters: {
            defaultAlias: 'user',
            allowed: ['id', 'name', 'profile.id']
        },
        relations: {
            allowed: ['profile']
        },
        pagination: {
            maxLimit: 20
        },
        sort: {
            defaultAlias: 'user',
            allowed: ['id', 'name', 'profile.id']
        }
    });

    const repository = getRepository(User);
    const query = repository.createQueryBuilder('user');

    // -----------------------------------------------------

    // apply parsed data on the db query.
    const parsed = applyQueryParseOutput(query, output);

    // -----------------------------------------------------

    const [entities, total] = await query.getManyAndCount();

    return res.json({
        data: {
            data: entities,
            meta: {
                total,
                ...output.pagination
            }
        }
    });
}
```

#### Parse - Third Party Library

It can even be much shorter to parse the query key values, because `typeorm-extension` uses `@trapi/query` under the hood ⚡.
This is much shorter than the previous example and has less direct dependencies 😁.

[read more](https://www.npmjs.com/package/typeorm-extension)

## Functions

## buildQuery

▸ `function` **buildQuery**<`T`>(`record: BuildInput<T>`, `options?: BuildOptions`): `string`

Build a query string from a provided [BuildInput](#buildinput).

#### Example
**`Simple`**

```typescript
import {
    buildQuery,
    Parameter
} from "@trapi/query";

type User = {
    id: number,
    name: string,
    age?: number
}

const query: string = buildQuery<User>({
    fields: ['+age'],
    relations: {
        name: '~pe'
    }
});

console.log(query);
// ?fields=+age&filter[name]=~pe
```

#### Type parameters

| Name | Description |
| :------ | :------ |
| `T` | A type, interface, or class which represent the data structure.


#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `BuildInput`<`T`> | Input specification [more](#buildinput). |
| `options` | `BuildOptions` | Options for building fields, filter, include, ...

#### Returns

`string`

The function returns a string, which can be parsed with the [parseQuery](#parsequery) function.

I.e. `/users?page[limit]=10&page[offset]=0&include=profile&filter[id]=1&fields[user]=id,name`

## parseQuery

▸ `function` **parseQuery**(`input: ParseInput`, `options?: ParseOptions`): `ParseOutput`

Parse a query string to an efficient data structure ⚡. The output will
be an object with each possible value of the [Parameter](#parameter) enum as property key and the
parsed data as value.

#### Example
**`Simple`**

```typescript
import {
    FieldOperator,
    FilterOperator,
    parseQuery,
    ParseOutput,
    URLParameter
} from "@trapi/query";
import {URLParameter} from "@trapi/query/src";

const output: ParseOutput = parseQuery({
    fields: ['+age'],
    filters: {
        name: '~pe'
    }
});

console.log(output);
//{
//    fields: [
//        {key: 'age', operator: FieldOperator.INCLUDE}
//    ],
//    filters: [
//        {key: 'name', value: 'pe', operator: FilterOperator.LIKE}
//   ]
//}
```

#### Type parameters

| Name | Description |
| :------ | :------ |


#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `ParseInput` | Query input data passed e.g. via URL [more](#parseinput). |
| `options` | `ParseOptions` | Options for parsing fields, filter, include, ... [more](#parseoptions)

#### Returns

[ParseOutput](#parseoutput)

The function returns an object.

## parseQueryParameter

▸ `function` **parseQueryParameter**<`T extends Parameter`>(
`key: T`,
`input: unknown`,
`options?: ParseParameterOptions<T>`
): `ParseParameterOutput<T>`

Parse a specific query [Parameter](#parameter) value to an efficient data structure ⚡.

#### Example
**`fields`**

```typescript
import {
    FieldOperator,
    FieldsParseOutput,
    Parameter,
    parseQueryParameter,
    URLParameter
} from "@trapi/query";

const output: FieldsParseOutput = parseQueryParameter(
    // 'fields' ||
    // Parameter.FIELDS | URLParameter.FIELDS
    'fields',
    ['+name'],
    {
        allowed: ['id', 'name'],
        defaultAlias: 'user'
    }
);

console.log(output);
// [{key: 'id', value: FieldOperator.INCLUDE}] ||
// [{key: 'id', value: '+'}]
```

**`filters`**

```typescript
import {
    FiltersParseOutput,
    Parameter,
    parseQueryParameter,
    URLParameter
} from "@trapi/query";

const output: FiltersParseOutput = parseQueryParameter(
    // 'filters' | 'filter' |
    // Parameter.FILTERS | URLParameter.FILTERS
    'filters',
    {id: 1},
    {
        allowed: ['id', 'name'],
        defaultAlias: 'user'
    }
);

console.log(output);
// [{alias: 'user', key: 'id', value: 1, }]
```

**`pagination`**

```typescript
import {
    PaginationParseOutput,
    Parameter,
    parseQueryParameter,
    URLParameter
} from "@trapi/query";

const output: PaginationParseOutput = parseQueryParameter(
    // 'pagination' | 'page' |
    // Parameter.PAGINATION | URLParameter.PAGINATION
    'pagination',
    {limit: 100},
    {
        maxLimit: 50
    }
);

console.log(output);
// {limit: 50}
```

**`relations`**

```typescript
import {
    RelationsParseOutput,
    Parameter,
    parseQueryParameter,
    URLParameter
} from "@trapi/query";

const output: RelationsParseOutput = parseQueryParameter(
    // 'relations' || 'include' ||
    // Parameter.RELATIONS | URLParameter.RELATIONS
    'relations',
    ['roles'],
    {
        allowed: ['roles', 'photos'],
        defaultAlias: 'user'
    }
);

console.log(output);
// [{key: 'user.roles', value: 'roles'}]
```

**`sort`**

```typescript
import {
    SortParseOutput,
    Parameter,
    parseQueryParameter,
    URLParameter
} from "@trapi/query";

const output: SortParseOutput = parseQueryParameter(
    // 'sort' ||
    // Parameter.SORT || URLParameter.SORT
    'sort',
    ['-name'],
    {
        allowed: ['id', 'name'],
        defaultAlias: 'user'
    }
);

console.log(output);
// [{alias: 'user', key: 'name', value: 'DESC'}]
```
#### Type parameters

| Name | Description |
| :------ | :------ |


#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `input` | `unknown` | Query input data passed e.g. via URL [more](#parseinput). |
| `options` | `ParseParameterOptions<Parameter>` | Options for parsing fields, filter, include, ... [more](#parseoptions)

#### Returns

[ParseOutput](#parseoutput)

The function returns an object.
## Types

### Build
#### BuildOptions
```typescript
export type BuildOptions = {
    // empty type for now :)
}
```
#### BuildInput
```typescript
export type BuildInput<
    V extends Record<string, any>
> = {
    [T in Parameter | URLParameter]?: BuildParameterInput<T, V>
}
```

### Parse

#### ParseOptions

```typescript
export type ParseOptions = {
    /**
     * On default all query keys are enabled.
     */
    [K in Parameter]?: ParseParameterOptions<K> | boolean
}
```
[ParseParameterOptions](#parseparameter)

#### ParseInput

````typescript
export type ParseInput = {
    [K in Parameter | URLParameter]?: any
}
````
[Parameter/URLParameter](#parameter)

#### ParseOutput

```typescript
export type ParseOutput = {
    [K in Parameter]?: ParseParameterOutput<K>
}
```
[ParseParameterOutput](#parseparameter)

#### ParseParameter
- `ParseParameterOptions<T extends ParameterType | URLParameterType>`
is a generic type and returns the available options for a given parameter type, i.e:
  - [FieldsParseOptions](#fields),
  - [FiltersParseOptions](#filters)
  - ...
- `ParseParameterOutput<T extends ParameterType | URLParameterType>`
is a generic type and returns the parsed output data for a given parameter type, i.e:
  - [FieldsParseOutput](#fields)
  - [FiltersParseOutput](#filters)
  - ...


### Parameter

`Parameter`
```typescript
export enum Parameter {
    FILTERS = 'filters',
    FIELDS = 'fields',
    PAGINATION = 'pagination',
    RELATIONS = 'relations',
    SORT = 'sort'
}

export type ParameterType = `${Parameter}`;
```

`URLParameter`
```typescript
export enum URLParameter {
    FILTERS = 'filter',
    FIELDS = 'fields',
    PAGINATION = 'page',
    RELATIONS = 'include',
    SORT = 'sort'
}

export type URLParameterType = `${Parameter}`;
```

#### Fields

`FieldsParseOptions`
```typescript
export type FieldsParseOptions =
    ParseOptionsBase<Parameter.FIELDS, Record<string, string[]> | string[]>;
```
The type structure looks like this:
```text
{
    aliasMapping?: Record<string, string>,
    allowed?: Record<string, string[]> | string[],
    relations?: RelationsParseOutput,
    defaultAlias?: string
}
```

`FieldsParseOutput`
```typescript
export enum FieldOperator {
    INCLUDE = '+',
    EXCLUDE = '-'
}

export type FieldsParseOutputElement =
    ParseOutputElementBase<Parameter.FIELDS, FieldOperator>;
export type FieldsParseOutput =
    FieldsParseOutputElement[];
```
The type structure looks like this:
```text
{
    // relation/resource alias
    alias?: string,

    // field name
    key: string,

    // '+' | '-'
    value?: FieldOperator
}
```

#### Filters

`FiltersParseOptions`
```typescript
export type FiltersParseOptions =
    ParseOptionsBase<Parameter.FILTERS>
```
The type structure looks like this:
```text
{
    aliasMapping?: Record<string, string>,
    allowed?: string[],
    relations?: RelationsParseOutput,
    defaultAlias?: string
}
```

`FiltersParseOutput`
```typescript
export enum FilterOperatorLabel {
    NEGATION = 'negation',
    LIKE = 'like',
    IN = 'in'
}

export type FiltersParseOutputElement =
    ParseOutputElementBase<
        Parameter.FILTERS,
        FilterValue<string | number | boolean | null>
    > & {
        operator?: {
            [K in FilterOperatorLabel]?: boolean
        }
    };
export type FiltersParseOutput = FiltersParseOutputElement[];
```
```text
{
    // relation/resource alias
    alias?: string,

    // filter name
    key: string,

    // {in: ..., ...}
    operator?: {
        [K in FilterOperatorLabel]?: boolean
    },

    value: FilterValue<string | number | boolean | null>
}
```
#### Pagination

`PaginationParseOptions`
```typescript
export type PaginationParseOptions =
    ParseOptionsBase<Parameter.PAGINATION> & {
        maxLimit?: number
    };
```
The type structure looks like this:
```text
{
    maxLimit?: number
}
```

`PaginationParseOutput`
```typescript
export type PaginationParseOutput = {
    limit?: number,
    offset?: number
};
```

#### Relations

`RelationsParseOptions`

```typescript
export type RelationsParseOptions =
    ParseOptionsBase<Parameter.SORT, string[] | string[][]>;
```
The type structure looks like this:
```text
{
    aliasMapping?: Record<string, string>,
    allowed?: string[],
    defaultAlias?: string,
    includeParents?: boolean | string[] | string
}
```

`RelationsParseOutput`
```typescript
export type RelationsParseOutputElement =
    ParseOutputElementBase<Parameter.RELATIONS, string>;
export type RelationsParseOutput = RelationsParseOutputElement[];
```
The type structure looks like this:
```text
{
    // relation relative depth path
    key: string,

    // relation alias
    value: string
}
```

#### Sort
`SortParseOptions`
```typescript
export type SortParseOptions = ParseOptionsBase<Parameter.SORT, string[] | string[][]>;
```

The type structure looks like this:
```text
{
    aliasMapping?: Record<string, string>,
    allowed?: string[] | string[][],
    defaultAlias?: string
    relations?: RelationsParseOutput
}
```

`SortParseOutput`
```typescript
export enum SortDirection {
    ASC = 'ASC',
    DESC = 'DESC'
}

export type SortParseOutputElement =
    ParseOutputElementBase<Parameter.SORT, SortDirection>;
export type SortParseOutput = SortParseOutputElement[];
```
The type structure looks like this:
```text
{
    // resource/relation alias
    alias?: string,

    // field name
    key: string,

    // 'ASC' | 'DESC'
    value: SortDirection
}
```
