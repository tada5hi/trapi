/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Controller,
    Get,
    Mount,
} from '../_stubs';

// Standalone never return type — function that always throws
type AlwaysThrows = never;

// Conditional type resolving to never (false branch of impossible condition)
type NeverBranch = number extends string ? { value: string } : never;

// Union containing never — preserved in metadata; stripped in swagger mapping
type CleanUnion = string | never;

@Controller()
@Mount('never-type')
export class NeverTypeController {
    @Get()
    @Mount('throws')
    public alwaysThrows(): AlwaysThrows {
        throw new Error('always throws');
    }

    @Get()
    @Mount('never-branch')
    public neverBranch(): NeverBranch {
        throw new Error('unreachable');
    }

    @Get()
    @Mount('clean-union')
    public cleanUnion(): CleanUnion {
        return 'hello';
    }
}
