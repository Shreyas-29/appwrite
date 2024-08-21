import { goto } from '$app/navigation';

import { derived, get, writable } from 'svelte/store';
import { page } from '$app/stores';
import deepEqual from 'deep-equal';
import type { Column, ColumnType } from '$lib/helpers/types';
import { Query } from '@appwrite.io/console';

export type TagValue = {
    tag: string;
    value: string | number | string[];
};

export type Operator = {
    toTag: (attribute: string, input?: string | number | string[]) => string | TagValue;
    toQuery: (attribute: string, input?: string | number | string[]) => string;
    types: ColumnType[];
    hideInput?: boolean;
};

export function mapToQueryParams(map: Map<string | TagValue, string>) {
    return encodeURIComponent(JSON.stringify(Array.from(map.entries())));
}

export function queryParamToMap(queryParam: string) {
    const decodedQueryParam = decodeURIComponent(queryParam);
    const queries = JSON.parse(decodedQueryParam) as [string, string][];
    return new Map(queries);
}

function initQueries(initialValue = new Map<string | TagValue, string>()) {
    const queries = writable(initialValue);

    type AddFilterArgs = {
        operator: Operator;
        column: Column;
        value: string | number | string[];
    };

    function addFilter({ column, operator, value }: AddFilterArgs) {
        queries.update((map) => {
            map.set(operator.toTag(column.id, value), operator.toQuery(column.id, value));
            return map;
        });
    }

    function removeFilter(tag: string | TagValue) {
        queries.update((map) => {
            map.delete(tag);
            return map;
        });
    }

    function clearAll() {
        queries.set(new Map());
    }

    function apply() {
        const queryParam = mapToQueryParams(get(queries));
        const currentLocation = window.location.pathname;
        goto(`${currentLocation}?query=${queryParam}`);
    }

    return {
        ...queries,
        addFilter,
        removeFilter,
        clearAll,
        apply
    };
}

export const queries = initQueries();
export const queriesAreDirty = derived([queries, page], ([$queries, $page]) => {
    const paramQueries = $page.url.searchParams.get('query');
    const parsedQueries = queryParamToMap(paramQueries || '[]');

    return !deepEqual($queries, parsedQueries);
});

export const hasPageQueries = derived(page, ($page) => {
    const paramQueries = $page.url.searchParams.get('query');
    const parsedQueries = queryParamToMap(paramQueries || '[]');
    return parsedQueries.size > 0;
});

export const tags = derived(queries, ($queries) => Array.from($queries.keys()));

/* eslint  @typescript-eslint/no-explicit-any: 'off' */
export function addFilter(
    columns: Column[],
    columnId: string,
    operatorKey: string,
    value: any, // We cast to any to not cause type errors in the input components
    arrayValues: string[] = []
) {
    const operator = operatorKey ? operators[operatorKey] : null;
    const column = columns.find((c) => c.id === columnId) as Column;

    if (!column || !operator) return;
    if (column.array) {
        queries.addFilter({ column, operator, value: arrayValues });
    } else {
        queries.addFilter({ column, operator, value: value ?? '' });
    }
}

export const operators: Record<string, Operator> = {
    'starts with': {
        toQuery: Query.startsWith,
        toTag: (attribute, input) => `**${attribute}** starts with **${input}**`,
        types: ['string']
    },
    'ends with': {
        toQuery: Query.endsWith,
        toTag: (attribute, input) => `**${attribute}** ends with **${input}**`,
        types: ['string']
    },
    'greater than': {
        toQuery: (attr, input) => Query.greaterThan(attr, Number(input)),
        toTag: (attribute, input) => `**${attribute}** greater than **${input}**`,
        types: ['integer', 'double', 'datetime']
    },
    'greater than or equal': {
        toQuery: (attr, input) => Query.greaterThanEqual(attr, Number(input)),
        toTag: (attribute, input) => `**${attribute}** greater than or equal to **${input}**`,
        types: ['integer', 'double', 'datetime']
    },
    'less than': {
        toQuery: Query.lessThan,
        toTag: (attribute, input) => `**${attribute}** less than **${input}**`,
        types: ['integer', 'double', 'datetime']
    },
    'less than or equal': {
        toQuery: Query.lessThanEqual,
        toTag: (attribute, input) => `**${attribute}** less than or equal to **${input}**`,
        types: ['integer', 'double', 'datetime']
    },
    equal: {
        toQuery: Query.equal,
        toTag: (attribute, input) => `**${attribute}** equal to **${input}**`,
        types: ['string', 'integer', 'double', 'boolean']
    },
    'not equal': {
        toQuery: Query.notEqual,
        toTag: (attribute, input) => `**${attribute}** not equal to **${input}**`,
        types: ['string', 'integer', 'double', 'boolean']
    },
    'is not null': {
        toQuery: Query.isNotNull,
        toTag: (attribute) => `**${attribute}** is not null`,
        types: ['string', 'integer', 'double', 'boolean', 'datetime', 'relationship'],
        hideInput: true
    },
    'is null': {
        toQuery: Query.isNull,
        toTag: (attribute) => `**${attribute}** is null`,
        types: ['string', 'integer', 'double', 'boolean', 'datetime', 'relationship'],
        hideInput: true
    },
    contains: {
        toQuery: Query.contains,
        toTag: (attribute, input) => {
            if (Array.isArray(input) && input.length > 2) {
                return {
                    value: input,
                    tag: `**${attribute}** contains **${formatArray(input)}** `
                };
            } else {
                return `**${attribute}** contains **${input}**`;
            }
        },
        types: ['string', 'integer', 'double', 'boolean', 'datetime', 'enum']
    }
};

function formatArray(array: string[]) {
    if (!array?.length) return;
    if (array.length > 2) {
        return `${array[0]} or ${array.length - 1} others`;
    } else {
        return array.join(' or ');
    }
}
