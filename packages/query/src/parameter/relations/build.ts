import { flattenNestedProperties } from '../utils';
import { RelationsBuildInput } from './type';

export function buildQueryRelations<T>(data: RelationsBuildInput<T>): string[] {
    const properties: Record<string, boolean> = flattenNestedProperties(data);
    const keys: string[] = Object.keys(properties);

    return Array.from(new Set(keys));
}
