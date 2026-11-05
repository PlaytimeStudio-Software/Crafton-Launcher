<template>
	<PageHeader :title="instance.name">
		<template #leading>
			<Avatar
				:src="iconSrc"
				:alt="instance.name"
				size="64px"
				:tint-by="instance.id"
				pad-transparent-corners
			/>
		</template>

		<template v-if="instance.quarantined" #badges>
			<PageHeaderBadgeItem
				:icon="LockIcon"
				aria-label="Locked instance information"
				class="!border-orange !bg-highlight-orange !text-orange"
			>
				Locked
			</PageHeaderBadgeItem>
		</template>

		<template #metadata>
			<PageHeaderMetadata>
				<PageHeaderMetadataItem
					:icon="TagIcon"
					:icon-props="{ tag: loaderDisplayName, enforceType: 'loader' }"
					tooltip="Mod loader and Minecraft version"
				>
					{{ loaderLabel }}
				</PageHeaderMetadataItem>
				<PageHeaderMetadataItem
					v-if="showInstancePlayTime && playtimeLabel"
					:icon="TimerIcon"
					tooltip="Total playtime"
				>
					{{ playtimeLabel }}
				</PageHeaderMetadataItem>
				<PageHeaderMetadataTimeItem
					v-if="instance.last_played"
					:icon="ClockIcon"
					:date="instance.last_played"
					:label="formatMessage(messages.lastPlayed)"
				/>
				<PageHeaderMetadataItem v-else :icon="ClockIcon" tooltip="Last played">
					{{ formatMessage(messages.neverPlayed) }}
				</PageHeaderMetadataItem>
			</PageHeaderMetadata>
		</template>

		<template #actions>
			<PageHeaderActions>
				<Button
					v-if="playing"
					type="colored"
					color="red"
					size="xl"
					native-type="button"
					:disabled="stopping"
					@click="emit('stop')"
				>
					<StopCircleIcon />
					{{
						stopping ? formatMessage(messages.stopping) : formatMessage(commonMessages.stopButton)
					}}
				</Button>
				<Button
					v-else-if="isInstalling"
					type="colored"
					color="brand"
					size="xl"
					native-type="button"
					disabled
				>
					{{ formatMessage(commonMessages.installingLabel) }}
				</Button>
				<Button
					v-else-if="instance.quarantined"
					v-tooltip="formatMessage(messages.lockedPlayTooltip)"
					type="colored"
					color="brand"
					size="xl"
					native-type="button"
					disabled
				>
					<PlayIcon />
					{{ formatMessage(commonMessages.playButton) }}
				</Button>
				<Button
					v-else-if="instance.install_stage !== 'installed'"
					type="colored"
					color="brand"
					size="xl"
					native-type="button"
					@click="emit('repair')"
				>
					<DownloadIcon />
					{{ formatMessage(messages.repair) }}
				</Button>
				<Button
					v-else-if="!loading"
					type="colored"
					color="brand"
					size="xl"
					native-type="button"
					@click="emit('play')"
				>
					<PlayIcon />
					{{ formatMessage(commonMessages.playButton) }}
				</Button>
				<Button v-else type="colored" color="brand" size="xl" native-type="button" disabled>{{
					formatMessage(messages.starting)
				}}</Button>

				<IconButton
					v-tooltip="formatMessage(messages.instanceSettings)"
					size="xl"
					:label="formatMessage(messages.instanceSettings)"
					native-type="button"
					@click="emit('settings')"
				>
					<SettingsIcon />
				</IconButton>
				<TeleportOverflowMenu
					type="quiet"
					size="xl"
					:label="formatMessage(messages.moreActions)"
					:tooltip="formatMessage(messages.moreActions)"
					:options="moreActions"
				>
					<MoreVerticalIcon />
				</TeleportOverflowMenu>
			</PageHeaderActions>
		</template>
	</PageHeader>
</template>

<script setup lang="ts">
import {
	ClockIcon,
	DownloadIcon,
	ExternalIcon,
	EyeIcon,
	EyeOffIcon,
	FolderOpenIcon,
	LockIcon,
	MoreVerticalIcon,
	PackageIcon,
	PlayIcon,
	SettingsIcon,
	StopCircleIcon,
	TimerIcon,
} from '@crafton/assets'
import { Button, IconButton, TeleportOverflowMenu } from '@crafton/ui'
import {
	Avatar,
	type ButtonMenuOption,
	commonMessages,
	defineMessages,
	formatLoaderLabel,
	PageHeader,
	PageHeaderActions,
	PageHeaderBadgeItem,
	PageHeaderMetadata,
	PageHeaderMetadataItem,
	PageHeaderMetadataTimeItem,
	TagIcon,
	useVIntl,
} from '@crafton/ui'
import { computed } from 'vue'

import { libraryInstanceMessages } from '@/features/library/messages'
import type { GameInstance } from '@/helpers/types'

const messages = defineMessages({
	createShortcut: {
		id: 'instance.action.create-shortcut',
		defaultMessage: 'Create shortcut',
	},
	exportModpack: {
		id: 'instance.action.export-modpack',
		defaultMessage: 'Export modpack',
	},
	instanceSettings: {
		id: 'instance.action.settings',
		defaultMessage: 'Instance settings',
	},
	moreActions: {
		id: 'instance.action.more-actions',
		defaultMessage: 'More actions',
	},
	neverPlayed: {
		id: 'instance.playtime.never-played',
		defaultMessage: 'Never played',
	},
	lastPlayed: {
		id: 'instance.last-played',
		defaultMessage: 'Last played',
	},
	openFolder: {
		id: 'instance.action.open-folder',
		defaultMessage: 'Open folder',
	},
	repair: {
		id: 'instance.action.repair',
		defaultMessage: 'Repair',
	},
	lockedPlayTooltip: {
		id: 'instance.locked.play-tooltip',
		defaultMessage: 'This instance has been locked',
	},
	starting: {
		id: 'instance.action.starting',
		defaultMessage: 'Starting...',
	},
	stopping: {
		id: 'instance.action.stopping',
		defaultMessage: 'Stopping...',
	},
})

const props = withDefaults(
	defineProps<{
		instance: GameInstance
		iconSrc?: string | null
		showInstancePlayTime?: boolean
		timePlayed?: number
		playing?: boolean
		loading?: boolean
		stopping?: boolean
		hiddenFromLibrary?: boolean
	}>(),
	{
		iconSrc: null,
		showInstancePlayTime: false,
		timePlayed: 0,
		playing: false,
		loading: false,
		stopping: false,
		hiddenFromLibrary: false,
	},
)

const emit = defineEmits<{
	repair: []
	stop: []
	play: []
	settings: []
	openFolder: []
	export: []
	createShortcut: []
	toggleHidden: []
}>()

const installingStages = ['installing', 'pack_installing', 'minecraft_installing']

const { formatMessage } = useVIntl()

const isInstalling = computed(() => installingStages.includes(props.instance.install_stage))

const loaderDisplayName = computed(() => formatLoaderLabel(props.instance.loader))
const loaderLabel = computed(() =>
	[loaderDisplayName.value, props.instance.game_version].filter(Boolean).join(' '),
)
const playtimeLabel = computed(() => {
	const seconds = Math.floor(props.timePlayed)
	if (seconds <= 0) {
		return undefined
	}

	const hours = Math.floor(seconds / 3600)
	if (hours >= 1) {
		return `${hours} hour${hours > 1 ? 's' : ''}`
	}

	const minutes = Math.floor(seconds / 60)
	if (minutes >= 1) {
		return `${minutes} minute${minutes > 1 ? 's' : ''}`
	}

	return `${seconds} second${seconds === 1 ? '' : 's'}`
})
const moreActions = computed<ButtonMenuOption[]>(() => {
	const actions: ButtonMenuOption[] = [
		{
			id: 'open-folder',
			label: formatMessage(messages.openFolder),
			icon: FolderOpenIcon,
			action: () => emit('openFolder'),
		},
	]

	if (!props.instance.quarantined) {
		actions.push(
			{
				id: 'export-mrpack',
				label: formatMessage(messages.exportModpack),
				icon: PackageIcon,
				action: () => emit('export'),
			},
			{
				id: 'create-shortcut',
				label: formatMessage(messages.createShortcut),
				icon: ExternalIcon,
				action: () => emit('createShortcut'),
			},
		)
	}

	actions.push(
		props.hiddenFromLibrary
			? {
					id: 'show-in-library',
					label: formatMessage(libraryInstanceMessages.showInLibrary),
					icon: EyeIcon,
					action: () => emit('toggleHidden'),
				}
			: {
					id: 'hide-from-library',
					label: formatMessage(libraryInstanceMessages.hideFromLibrary),
					icon: EyeOffIcon,
					action: () => emit('toggleHidden'),
				},
	)

	return actions
})
</script>
