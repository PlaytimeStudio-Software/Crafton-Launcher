<script setup lang="ts">
import { ChevronLeftIcon, ChevronRightIcon } from '@crafton/assets'
import { defineMessages, IconButton, useVIntl } from '@crafton/ui'
import { useRouter } from 'vue-router'

import steveHead from '@/assets/steve_head.png'
import { useAccountPanel } from '@/composables/use-account-panel'
import { injectMinecraftAccounts } from '@/features/minecraft-accounts/context'

import AppActionBar from './action-bar.vue'
import Breadcrumbs from './breadcrumbs.vue'
import WindowControls from './window-controls.vue'

defineProps<{
	canNavigateBack: boolean
	canNavigateForward: boolean
}>()

const router = useRouter()
const accountPanel = useAccountPanel()
const minecraftAccounts = injectMinecraftAccounts()
const { formatMessage } = useVIntl()
const messages = defineMessages({
	goBack: { id: 'app.navigation.go-back', defaultMessage: 'Go back' },
	goForward: { id: 'app.navigation.go-forward', defaultMessage: 'Go forward' },
	showPanel: { id: 'app.navigation.show-account-panel', defaultMessage: 'Show account panel' },
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
			<button
				v-if="accountPanel.showReopen.value"
				v-tooltip="formatMessage(messages.showPanel)"
				:aria-label="formatMessage(messages.showPanel)"
				class="account-head mr-3"
				@click="accountPanel.show()"
			>
				<img :src="minecraftAccounts?.avatarUrl ?? steveHead" alt="" draggable="false" />
			</button>
			<WindowControls />
		</section>
	</div>
</template>

<style scoped lang="scss">
.account-head {
	display: flex;
	width: 2rem;
	height: 2rem;
	padding: 0;
	border-radius: 0.5rem;
	border: 1px solid var(--surface-5);
	overflow: hidden;
	background: var(--surface-3);
	cursor: pointer;
	transition:
		border-color 0.15s ease,
		box-shadow 0.15s ease,
		transform 0.15s ease;

	img {
		width: 100%;
		height: 100%;
		image-rendering: pixelated;
	}

	&:hover {
		border-color: var(--color-brand);
		box-shadow: 0 0 0.6rem var(--color-brand-highlight);
		transform: translateY(-1px);
	}
}

.app-title-bar {
	height: var(--top-bar-height);
	padding-right: var(--window-controls-width, 0px);
}
</style>
