/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Controller, Get } from '../_stubs';
import {
    CONST_MOUNT,
    CONST_SUB,
    MOUNT_A,
    MOUNT_B,
    Mounts,
    PATHS,
    SEGMENT,
    TYPED_MOUNT,
} from '../path-constants';
import { BARREL_MOUNT } from '../path-constants-barrel';

const LOCAL_MOUNT = '/local-mount';

@Controller(CONST_MOUNT)
export class ImportedConstController {
    @Get(CONST_SUB)
    public list(): string[] {
        return [];
    }
}

@Controller([MOUNT_A, MOUNT_B])
export class ImportedConstArrayController {
    @Get()
    public list(): string[] {
        return [];
    }
}

@Controller(`/${SEGMENT}`)
export class TemplateExpressionController {
    @Get(`/${SEGMENT}-sub`)
    public list(): string[] {
        return [];
    }
}

@Controller(BARREL_MOUNT)
export class BarrelConstController {
    @Get()
    public list(): string[] {
        return [];
    }
}

@Controller(LOCAL_MOUNT)
export class LocalConstController {
    @Get()
    public list(): string[] {
        return [];
    }
}

@Controller(TYPED_MOUNT)
export class TypedImportedConstController {
    @Get()
    public list(): string[] {
        return [];
    }
}

@Controller(PATHS.object)
export class ConstObjectPropertyController {
    @Get()
    public list(): string[] {
        return [];
    }
}

@Controller(Mounts.Enum)
export class EnumMemberController {
    @Get()
    public list(): string[] {
        return [];
    }
}
