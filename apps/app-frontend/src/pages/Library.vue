<script setup lang="ts">
import { PlusIcon } from '@crafton/assets'
import { ContextMenu, defineMessages, injectNotificationManager, useVIntl } from '@crafton/ui'
import { useQuery } from '@tanstack/vue-query'
import { inject, onActivated, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import libraryIcon from '@/assets/redesign/icon-library.webp'
import LibrarySection from '@/components/ui/library/index.vue'
import { libraryScrollTop } from '@/components/ui/library/view-state'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import { useRootBreadcrumb } from '@/shared/breadcrumbs'

defineOptions({ name: 'LibraryPage' })

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const showCreationModal = inject<() => void>('showCreationModal')
const pageOptions = ref<InstanceType<typeof ContextMenu>>()

const messages = defineMessages({
	library: { id: 'app.navigation.library', defaultMessage: 'Library' },
	newInstance: {
		id: 'app.library.context-menu.create-instance',
		defaultMessage: 'New instance',
	},
	libraryActionsLabel: {
		id: 'app.library.actions.label',
		defaultMessage: 'Library actions',
	},
})

const breadcrumb = useRootBreadcrumb({
	slot: 'root',
	id: 'library',
	label: formatMessage(messages.library),
	to: '/library',
	visual: { type: 'image', src: libraryIcon, alt: '' },
})
onActivated(breadcrumb.reset)

onBeforeRouteLeave(() => {
	libraryScrollTop.value = document.querySelector('.app-viewport')?.scrollTop ?? 0
})

const instancesQuery = useQuery(instanceListQueryOptions())
await instancesQuery.suspense().catch(handleError)

function openPageContextMenu(event: MouseEvent) {
	if (
		!(event.target instanceof HTMLElement) ||
		!event.target.hasAttribute('data-library-page-background')
	) {
		return
	}

	event.preventDefault()
	event.stopPropagation()
	pageOptions.value?.open(event, [
		{
			id: 'new_instance',
			label: formatMessage(messages.newInstance),
			icon: PlusIcon,
			action: () => showCreationModal?.(),
		},
	])
}
</script>

<template>
	<div
		data-library-page-background
		class="flex flex-col gap-3 p-6"
		@contextmenu="openPageContextMenu"
	>
		<LibrarySection :instances="instancesQuery.data.value ?? []" />
		<ContextMenu ref="pageOptions" :label="formatMessage(messages.libraryActionsLabel)" />
	</div>
</template>
