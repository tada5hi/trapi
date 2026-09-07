/*
 * Mount paths declared OUTSIDE the controllers glob on purpose: the point of
 * the `const-paths` fixture is that the constant is reached through an import
 * alias, which is the shape that used to fold to `unresolvable`.
 */

export const CONST_MOUNT = '/const-mount';
export const CONST_SUB = '/const-sub';

export const MOUNT_A = '/mount-a';
export const MOUNT_B = '/mount-b';

export const SEGMENT = 'segment';

export const LOCAL_UNUSED = '/unused';
