<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@crafton/assets'
import { defineMessages, IconButton, useVIntl } from '@crafton/ui'
import { useRouter } from 'vue-router'

import AppActionBar from './action-bar.vue'
import Breadcrumbs from './breadcrumbs.vue'
import WindowControls from './window-controls.vue'

defineProps<{
	canNavigateBack: boolean
	canNavigateForward: boolean
}>()

const router = useRouter()
const { formatMessage } = useVIntl()
const messages = defineMessages({
	goBack: { id: 'app.navigation.go-back', defaultMessage: 'Go back' },
	goForward: { id: 'app.navigation.go-forward', defaultMessage: 'Go forward' },
})
</script>

<template>
	<div
		data-tauri-drag-region
		class="app-title-bar relative z-[2] flex bg-bg-raised pl-1 [grid-area:status]"
	>
		<div data-tauri-drag-region class="flex min-w-0 flex-1 items-center overflow-hidden p-2">
			<div data-tauri-drag-region class="flex shrink-0 items-center gap-2">
				<IconButton
					type="outlined"
					:label="formatMessage(messages.goBack)"
					class="!h-7 !min-w-7 !w-7 !border !border-surface-4 !p-0 !opacity-100"
					:disabled="!canNavigateBack"
					@click="router.back()"
				>
					<ChevronLeftIcon
						class="!size-4 !text-primary"
						:class="{ 'opacity-20': !canNavigateBack }"
					/>
				</IconButton>
				<IconButton
					type="outlined"
					:label="formatMessage(messages.goForward)"
					class="!h-7 !min-w-7 !w-7 !border !border-surface-4 !p-0 !opacity-100"
					:disabled="!canNavigateForward"
					@click="router.forward()"
				>
					<ChevronRightIcon
						class="!size-4 !text-primary"
						:class="{ 'opacity-20': !canNavigateForward }"
					/>
				</IconButton>
			</div>
			<Breadcrumbs />
		</div>
		<section data-tauri-drag-region class="flex shrink-0 ml-auto items-center">
			<div class="flex mr-3">
				<Suspense>
					<AppActionBar />
				</Suspense>
			</div>
			<WindowControls />
		</section>
	</div>
</template>

<style scoped>
.app-title-bar {
	height: var(--top-bar-height);
	padding-right: var(--window-controls-width, 0px);
}
</style>
