import { goto } from '$app/navigation';
import { project } from '$routes/console/project-[project]/store';
import { get } from 'svelte/store';
import type { Searcher } from '../commands';
import { sdk } from '$lib/stores/sdk';
import { MessagingProviderType } from '@appwrite.io/console';

const getLabel = (message) => {
    switch (message.providerType) {
        case MessagingProviderType.Push:
            return message.data.title;
        case MessagingProviderType.Sms:
            return message.data.content;
        case MessagingProviderType.Email:
            return message.data.subject;
        default:
            return 'null';
    }
};

export const messagesSearcher = (async (query: string) => {
    const { messages } = await sdk.forProject.messaging.listMessages([], query || undefined);

    console.log(messages);
    const projectId = get(project).$id;

    return messages
        .filter((message) => getLabel(message).toLowerCase().includes(query.toLowerCase()))
        .map(
            (message) =>
                ({
                    group: 'messaging',
                    label: getLabel(message),
                    callback: () => {
                        goto(`/console/project-${projectId}/messaging/message-${message.$id}`);
                    },
                    icon: 'send',
                }) as const
        );
}) satisfies Searcher;
