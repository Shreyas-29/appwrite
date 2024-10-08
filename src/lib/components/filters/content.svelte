<script lang="ts">
    import {
        Button,
        InputNumber,
        InputSelect,
        InputText,
        InputTags,
        FormList,
        InputSelectCheckbox
    } from '$lib/elements/forms';
    import { createEventDispatcher, onMount } from 'svelte';
    import { tags, queries, type TagValue, operators, addFilter } from './store';
    import type { Column } from '$lib/helpers/types';
    import type { Writable } from 'svelte/store';
    import { tooltip } from '$lib/actions/tooltip';

    // We cast to any to not cause type errors in the input components
    /* eslint  @typescript-eslint/no-explicit-any: 'off' */
    export let value: any = null;
    export let columns: Writable<Column[]>;
    export let columnId: string | null = null;
    export let arrayValues: string[] = [];
    export let operatorKey: string | null = null;

    $: column = $columns.find((c) => c.id === columnId) as Column;

    $: operatorsForColumn = Object.entries(operators)
        .filter(([, v]) => v.types.includes(column?.type))
        .map(([k]) => ({
            label: k,
            value: k
        }));

    $: operator = operatorKey ? operators[operatorKey] : null;
    $: {
        columnId;
        operatorKey = null;
    }

    $: isDisabled = !operator;

    onMount(() => {
        value = column?.array ? [] : null;
    });

    function addFilterAndReset() {
        addFilter($columns, columnId, operatorKey, value, arrayValues);
        columnId = null;
        operatorKey = null;
        value = null;
        arrayValues = [];
    }

    function tagFormat(node: HTMLElement) {
        node.innerHTML = node.innerHTML.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    }

    function isTypeTagValue(obj: any): obj is TagValue {
        if (typeof obj === 'string') return false;
        return (
            obj &&
            typeof obj.tag === 'string' &&
            (typeof obj.value === 'string' ||
                typeof obj.value === 'number' ||
                Array.isArray(obj.value))
        );
    }

    const dispatch = createEventDispatcher<{
        clear: void;
        apply: { applied: number };
    }>();
    dispatch('apply', { applied: $tags.length });
</script>

<div>
    <form on:submit|preventDefault={addFilterAndReset}>
        <ul class="selects u-flex u-gap-8 u-margin-block-start-16">
            <InputSelect
                id="column"
                options={$columns
                    .filter((c) => c.filter !== false)
                    .map((c) => ({
                        label: c.title,
                        value: c.id
                    }))}
                placeholder="Select column"
                bind:value={columnId} />
            <InputSelect
                id="operator"
                disabled={!column}
                options={operatorsForColumn}
                placeholder="Select operator"
                bind:value={operatorKey} />
        </ul>
        {#if column && operator && !operator?.hideInput}
            {#if column?.array}
                <FormList class="u-margin-block-start-8">
                    {#if column.format === 'enum'}
                        <InputSelectCheckbox
                            name="value"
                            bind:tags={arrayValues}
                            placeholder="Select value"
                            options={column?.elements?.map((value) => ({
                                label: value,
                                value,
                                checked: arrayValues.includes(value)
                            }))}>
                        </InputSelectCheckbox>
                    {:else}
                        <InputTags
                            label="values"
                            showLabel={false}
                            id="value"
                            bind:tags={arrayValues}
                            placeholder="Enter values" />
                    {/if}
                </FormList>
            {:else}
                <ul class="u-margin-block-start-8">
                    {#if column.format === 'enum'}
                        <InputSelect
                            id="value"
                            bind:value
                            placeholder="Select value"
                            options={column?.elements?.map((value) => ({ label: value, value }))}
                            label="Value"
                            showLabel={false} />
                    {:else if column.type === 'integer' || column.type === 'double'}
                        <InputNumber id="value" bind:value placeholder="Enter value" />
                    {:else if column.type === 'boolean'}
                        <InputSelect
                            id="value"
                            placeholder="Select a value"
                            required={true}
                            options={[
                                { label: 'True', value: true },
                                { label: 'False', value: false }
                            ].filter(Boolean)}
                            bind:value />
                    {:else}
                        <InputText id="value" bind:value placeholder="Enter value" />
                    {/if}
                </ul>
            {/if}
        {/if}
        <Button text disabled={isDisabled} class="u-margin-block-start-4" noMargin submit>
            <i class="icon-plus" />
            Add condition
        </Button>
    </form>

    <ul class="u-flex u-flex-wrap u-cross-center u-gap-8 u-margin-block-start-16 tags">
        {#each $tags as tag (tag)}
            {#if isTypeTagValue(tag)}
                <button
                    use:tooltip={{
                        content: tag?.value?.toString()
                    }}
                    class="tag"
                    on:click={() => {
                        queries.removeFilter(tag);
                    }}>
                    <span class="text" use:tagFormat>
                        {tag.tag}
                    </span>
                    <i class="icon-x" />
                </button>
            {:else}
                <button
                    class="tag"
                    on:click={() => {
                        queries.removeFilter(tag);
                    }}>
                    <span class="text" use:tagFormat>
                        {tag}
                    </span>
                    <i class="icon-x" />
                </button>
            {/if}
        {/each}
    </ul>
</div>

<style lang="scss">
    .selects {
        :global(> *) {
            flex: 1;
        }
    }

    .tags {
        :global(b) {
            font-weight: bold;
        }
    }
</style>
