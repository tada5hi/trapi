/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get,
    Mount,
    Path,
    Post,
} from '../../../src';
import type {
    DeprecatedModel,
    GenericWrapper,
    ModelWithNullable,
    NestedGeneric,
    NullableString,
    PartialPerson,
    Person,
    RecordOfStrings,
    TimestampedPerson,
    TreeNode,
    TypeA,
} from '../type';

@Controller()
@Mount('complex')
export class ComplexTypesController {
    @Get()
    @Mount('tree')
    public getTree(): TreeNode {
        return { value: 'root', children: [] };
    }

    @Get()
    @Mount('mutual')
    public getMutualRef(): TypeA {
        return { name: 'test' };
    }

    @Get()
    @Mount('partial')
    public getPartial(): PartialPerson {
        return {};
    }

    @Get()
    @Mount('record')
    public getRecord(): RecordOfStrings {
        return {};
    }

    @Get()
    @Mount('generic')
    public getGeneric(): GenericWrapper<Person> {
        return { data: { name: 'test' }, meta: { count: 1 } };
    }

    @Get()
    @Mount('nested-generic')
    public getNestedGeneric(): NestedGeneric {
        return { data: { data: 'inner', meta: { count: 0 } }, meta: { count: 1 } };
    }

    @Get()
    @Mount('intersection')
    public getIntersection(): TimestampedPerson {
        return {
            name: 'test', 
            createdAt: '', 
            updatedAt: '', 
        };
    }

    @Get()
    @Mount('nullable')
    public getNullable(): ModelWithNullable {
        return { name: 'test', nickname: null };
    }

    @Get()
    @Mount('nullable-alias')
    public getNullableAlias(): NullableString {
        return null;
    }

    @Get()
    @Mount('deprecated')
    public getDeprecated(): DeprecatedModel {
        return { oldField: 'value' };
    }
}
