<script setup lang="ts">
import { MoreVerticalIcon, SpinnerIcon } from '@crafton/assets'
import {
	Avatar,
	type ButtonMenuOption,
	defineMessages,
	formatLoader,
	TeleportOverflowMenu,
	useVIntl,
} from '@crafton/ui'

import type { LibraryInstance } from '@/features/library/library-instance'
import { libraryInstanceMessages } from '@/features/library/messages'
import { getInstanceIconUrl } from '@/helpers/instance'

defineProps<{
	instance: LibraryInstance
	options: ButtonMenuOption[]
	loading?: boolean
}>()

const emit = defineEmits<{
	activate: [event?: MouseEvent]
}>()

const handleKeydown = (event: KeyboardEvent) => {
	if (event.target !== event.currentTarget) return
	if (event.key === 'Enter' || event.key === ' ') {
		event.preventDefault()
		emit('activate')
	}
}

const { formatMessage } = useVIntl()
const messages = defineMessages({
	moreOptions: {
		id: 'app.behavior-settings.hidden-instances.more-options',
		defaultMessage: 'More options',
	},
})
</script>

<template>
	<div
		class="flex cursor-pointer items-center gap-3 rounded-[20px] bg-surface-3 p-3 -outline-offset-2 transition-[filter] hover:brightness-110 focus-visible:!outline-2"
		role="button"
		tabindex="0"
		:aria-label="
			formatMessage(libraryInstanceMessages.openWithName, {
				name: instance.name,
			})
		"
		@click="(event: MouseEvent) => emit('activate', event)"
		@keydown="handleKeydown"
	>
		<div class="relative flex shrink-0 overflow-clip rounded-2xl">
			<Avatar
				:src="getInstanceIconUrl(instance.icon_path)"
				cache-icon
				:tint-by="instance.id"
				:alt="instance.name"
				size="56px"
				no-shadow
				class="!rounded-2xl"
				pad-transparent-corners
			/>
			<div
				v-if="loading"
				class="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center"
			>
				<div class="absolute inset-0 bg-surface-1 opacity-30" />
				<SpinnerIcon
					v-tooltip="formatMessage(libraryInstanceMessages.installing)"
					class="relative size-5 animate-spin text-contrast"
				/>
			</div>
		</div>
		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<span class="truncate font-semibold text-contrast">{{ instance.name }}</span>
			<div class="flex min-w-0 items-center gap-1.5 text-sm font-medium text-secondary">
				<span class="truncate">
					{{ formatLoader(formatMessage, instance.loader) }} {{ instance.game_version }}
				</span>
			</div>
		</div>
		<div class="shrink-0" @click.stop>
			<TeleportOverflowMenu
				type="quiet"
				:label="formatMessage(messages.moreOptions)"
				:options="options"
			>
				<MoreVerticalIcon class="size-5" />
			</TeleportOverflowMenu>
		</div>
	</div>
</template>
