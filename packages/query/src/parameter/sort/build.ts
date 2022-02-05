import { flattenNestedProperties } from '../../utils';
import { SortBuildInput } from './type';

export function buildQuerySort<T>(data: SortBuildInput<T>) {
    switch (true) {
        case typeof data === 'string':
            return data;
        case Array.isArray(data):
            return data;
        default:
            return flattenNestedProperties(data as Record<string, any>);
    }
}
