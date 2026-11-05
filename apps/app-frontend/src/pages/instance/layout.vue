<template>
	<div v-if="instance" :class="{ 'flex h-full flex-col': isFixedRender }">
		<div
			:class="['p-6 pr-2 pb-4', { 'shrink-0': isFixedRender }]"
			@contextmenu.prevent.stop="(event) => handleRightClick(event)"
		>
			<ExportModal v-if="!instance.quarantined" ref="exportModal" :instance="instance" />
			<ConfirmDeleteInstanceModal
				ref="deleteConfirmModal"
				:instances="selectedInstanceToDelete ? [selectedInstanceToDelete] : []"
				@delete="deleteSelectedInstance"
			/>
			<InstanceSettingsModal
				:key="instance.id"
				ref="settingsModal"
				:instance="instance"
				:offline="offline"
				@unlinked="refreshInstance"
			/>
			<InstancePageHeader
				:instance="instance"
				:icon-src="icon"
				:show-instance-play-time="showInstancePlayTime"
				:time-played="timePlayed"
				:playing="playing"
				:loading="loading || instanceLaunch.isStarting(instance.id)"
				:stopping="stopping"
				:hidden-from-library="hiddenFromLibrary"
				@repair="() => repairInstance()"
				@stop="() => stopInstance('InstancePage')"
				@play="() => startInstance('InstancePage')"
				@settings="() => settingsModal?.show()"
				@open-folder="() => instance && showInstanceInFolder(instance.id)"
				@export="() => !instance?.quarantined && exportModal?.show()"
				@create-shortcut="() => createShortcut()"
				@toggle-hidden="() => toggleHiddenFromLibrary()"
			/>
		</div>
		<div :class="['px-6', { 'shrink-0': isFixedRender }]">
			<NavTabs :links="tabs" />
			<InstanceAdmonitions class="mt-4" :instance="instance" @delete="requestInstanceDeletion" />
		</div>
		<div :class="['p-6 pt-4', { 'min-h-0 flex-1 overflow-y-auto': isFixedRender }]">
			<RouterView v-slot="{ Component }">
				<template v-if="Component">
					<Suspense
						:key="instance.id"
						@pending="subpagePending = true"
						@resolve="subpagePending = false"
					>
						<component :is="Component" />
					</Suspense>
				</template>
			</RouterView>
		</div>
		<ContextMenu ref="options" :label="formatMessage(messages.instanceActionsLabel)" />
	</div>
</template>
<script setup lang="ts">
import {
	BoxesIcon,
	ClipboardCopyIcon,
	EditIcon,
	FolderOpenIcon,
	GlobeIcon,
	ImageIcon,
	PlayIcon,
	PlusIcon,
	StopCircleIcon,
	TerminalSquareIcon,
} from '@crafton/assets'
import {
	commonMessages,
	ContextMenu,
	defineMessages,
	injectNotificationManager,
	NavTabs,
	useLoadingBarToken,
	useVIntl,
} from '@crafton/ui'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/vue-query'
import { useOnline } from '@vueuse/core'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { computed, type ComputedRef, onUnmounted, ref, shallowRef, watch } from 'vue'
import { onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'

import ExportModal from '@/components/ui/ExportModal.vue'
import ConfirmDeleteInstanceModal from '@/components/ui/modal/ConfirmDeleteInstanceModal.vue'
import { useAppEvent } from '@/composables/use-app-event'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { handleSevereError } from '@/composables/use-error.js'
import { useInstanceConsole } from '@/composables/useInstanceConsole'
import { injectInstanceLaunchState } from '@/features/instances/launch-state'
import InstanceSettingsModal from '@/features/instances/settings-modal/index.vue'
import { useHiddenInstances } from '@/features/library/hidden-instances/use-hidden-instances'
import { trackEvent } from '@/helpers/analytics'
import { toError } from '@/helpers/errors'
import { install_existing_instance, install_pack_to_existing_instance } from '@/helpers/install'
import {
	get_full_path,
	getInstanceIconUrl,
	kill,
	refresh_content_updates,
	remove,
	run,
	sync_content_files,
} from '@/helpers/instance'
import type { GameInstance } from '@/helpers/types'
import { createInstanceShortcut, showInstanceInFolder } from '@/helpers/utils.js'
import { provideInstanceBackup } from '@/providers/instance-backup'
import { useRootBreadcrumb } from '@/shared/breadcrumbs'

import InstanceAdmonitions from './components/admonitions/index.vue'
import InstancePageHeader from './components/page-header/index.vue'
import { provideInstancePage } from './instance-context'
import {
	instanceContentQueryOptions,
	instanceDetailQueryOptions,
	instanceKeys,
	instanceLinkedProjectQueryOptions,
	instanceProcessesQueryOptions,
} from './query-options'

dayjs.extend(relativeTime)

const { addNotification, handleError } = injectNotificationManager()
const queryClient = useQueryClient()
const route = useRoute()
const { formatMessage } = useVIntl()

const messages = defineMessages({
	play: { id: 'app.instance.action.play', defaultMessage: 'Play' },
	stop: { id: 'app.instance.action.stop', defaultMessage: 'Stop' },
	addContent: { id: 'app.instance.action.add-content', defaultMessage: 'Add content' },
	edit: { id: 'app.instance.action.edit', defaultMessage: 'Edit' },
	copyPath: { id: 'app.instance.action.copy-path', defaultMessage: 'Copy path' },
	openFolder: { id: 'app.instance.action.open-folder', defaultMessage: 'Open folder' },
	instanceActionsLabel: {
		id: 'app.instance.actions.label',
		defaultMessage: 'Instance actions',
	},
	contentTab: { id: 'app.instance.tab.content', defaultMessage: 'Content' },
	filesTab: { id: 'app.instance.tab.files', defaultMessage: 'Files' },
	screenshotsTab: { id: 'app.instance.tab.screenshots', defaultMessage: 'Screenshots' },
	worldsTab: { id: 'app.instance.tab.worlds', defaultMessage: 'Worlds' },
	logsTab: { id: 'app.instance.tab.logs', defaultMessage: 'Logs' },
	shortcutCreated: {
		id: 'app.instance.shortcut.created',
		defaultMessage: 'Shortcut created',
	},
	shortcutCreationError: {
		id: 'app.instance.shortcut.creation-error',
		defaultMessage: 'Error creating shortcut',
	},
})

const router = useRouter()
const displayedInstanceRoute = shallowRef(router.currentRoute.value)
watch(
	() => router.currentRoute.value,
	(nextRoute) => {
		if (nextRoute.path.startsWith('/instance/')) {
			displayedInstanceRoute.value = nextRoute
		}
	},
	{ immediate: true },
)
const appSettings = useAppSettings()
const showInstancePlayTime = computed(() => appSettings.showPlayTime)

const online = useOnline()
const offline = computed(() => !online.value)
const instanceId = computed(() => String(displayedInstanceRoute.value.params.id ?? ''))
const instanceQuery = useQuery(
	computed(() =>
		queryOptions({
			...instanceDetailQueryOptions(instanceId.value),
			enabled: !!instanceId.value,
		}),
	),
)
useQuery(
	computed(() =>
		queryOptions({
			...instanceContentQueryOptions(instanceId.value, (error) => handleError(toError(error))),
			enabled: !!instanceId.value,
		}),
	),
)
const instance = computed(() => instanceQuery.data.value)

const {
	hiddenIds: hiddenInstanceIds,
	hide: hideInstance,
	show: showInstance,
} = useHiddenInstances()
const hiddenFromLibrary = computed(
	() => !!instance.value && hiddenInstanceIds.value.has(instance.value.id),
)
const toggleHiddenFromLibrary = () => {
	if (!instance.value) return
	void (hiddenFromLibrary.value ? showInstance : hideInstance)(instance.value.id)
}
async function invalidateContent(targetInstanceId: string) {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: instanceKeys.content(targetInstanceId) }),
		queryClient.invalidateQueries({ queryKey: instanceKeys.linkedContent(targetInstanceId) }),
	])
}

const contentSyncQuery = useQuery(
	computed(() => {
		const targetInstanceId = instanceId.value
		return {
			queryKey: instanceKeys.contentSync(targetInstanceId),
			queryFn: async () => {
				try {
					await sync_content_files(targetInstanceId)
					await invalidateContent(targetInstanceId)
					return targetInstanceId
				} catch (error) {
					handleError(toError(error))
					throw error
				}
			},
			enabled: !!targetInstanceId && instance.value?.install_stage === 'installed',
			networkMode: 'always' as const,
			staleTime: 0,
			gcTime: 0,
			refetchOnWindowFocus: false,
			refetchOnReconnect: false,
			retry: false,
		}
	}),
)
useQuery(
	computed(() => ({
		queryKey: instanceKeys.contentUpdateCheck(instanceId.value),
		queryFn: async () => {
			const targetInstanceId = instanceId.value
			await refresh_content_updates(targetInstanceId)
			await invalidateContent(targetInstanceId)
			return targetInstanceId
		},
		enabled:
			!!instanceId.value &&
			!offline.value &&
			instance.value?.install_stage === 'installed' &&
			contentSyncQuery.isSuccess.value &&
			!contentSyncQuery.isFetching.value &&
			contentSyncQuery.data.value === instanceId.value,
		staleTime: 10 * 60_000,
		gcTime: 30 * 60_000,
		retry: false,
	})),
)
const linkedProjectId = computed(() => instance.value?.link?.project_id ?? '')
const linkedProjectQuery = useQuery(
	computed(() =>
		queryOptions({
			...instanceLinkedProjectQueryOptions(linkedProjectId.value),
			enabled: !!linkedProjectId.value && !offline.value,
		}),
	),
)
const linkedProjectV3 = computed(() => linkedProjectQuery.data.value ?? undefined)
const processesQuery = useQuery(
	computed(() =>
		queryOptions({
			...instanceProcessesQueryOptions(instanceId.value),
			enabled: !!instanceId.value,
		}),
	),
)
const playing = computed(() => (processesQuery.data.value?.length ?? 0) > 0)

async function ensureCriticalContent(targetInstanceId: string) {
	await queryClient.ensureQueryData(
		instanceContentQueryOptions(targetInstanceId, (error) => handleError(toError(error))),
	)
}

async function ensureCriticalInstanceData(targetInstanceId: string) {
	await Promise.all([
		queryClient.ensureQueryData(instanceDetailQueryOptions(targetInstanceId)),
		ensureCriticalContent(targetInstanceId),
	])
}

function isUnmanagedInstanceError(error: unknown) {
	return error instanceof Error && error.message.includes('is not managed')
}

try {
	await ensureCriticalInstanceData(instanceId.value)
} catch (error) {
	if (isUnmanagedInstanceError(error)) await router.replace('/')
	else handleError(toError(error))
}

onBeforeRouteUpdate(async (to, from) => {
	const targetInstanceId = String(to.params.id ?? '')
	const currentInstanceId = String(from.params.id ?? '')
	if (!targetInstanceId || targetInstanceId === currentInstanceId) return

	try {
		await ensureCriticalInstanceData(targetInstanceId)
	} catch (error) {
		if (isUnmanagedInstanceError(error)) return { path: '/' }
		handleError(toError(error))
		return false
	}
})

useRootBreadcrumb({
	slot: 'instance',
	id: () => `instance:${instanceId.value}`,
	label: () => instance.value?.name ?? formatMessage(commonMessages.loadingLabel),
	visual: () => ({
		type: 'image',
		src: getInstanceIconUrl(instance.value?.icon_path),
		alt: instance.value?.name,
		tintBy: instance.value?.id ?? instanceId.value,
	}),
	to: () => `/instance/${encodeURIComponent(instanceId.value)}`,
})

const loading = ref(false)
const instanceLaunch = injectInstanceLaunchState()
const subpagePending = ref(false)
const stopping = ref(false)
const exportModal = ref<InstanceType<typeof ExportModal>>()
const deleteConfirmModal = ref<InstanceType<typeof ConfirmDeleteInstanceModal>>()
const settingsModal = ref<InstanceType<typeof InstanceSettingsModal>>()
const selectedInstanceToDelete = ref<GameInstance | null>(null)

useLoadingBarToken(subpagePending)
useLoadingBarToken(computed(() => instanceQuery.isPending.value && !instance.value))

async function refreshInstance() {
	await instanceQuery.refetch()
}

async function refreshPlayState() {
	await processesQuery.refetch()
}

watch(
	instanceQuery.error,
	(error) => {
		if (!error) return
		if (error.message.includes('is not managed')) void router.replace('/')
		else handleError(toError(error))
	},
	{ immediate: true },
)
watch(
	linkedProjectQuery.error,
	(error) => {
		if (error) handleError(toError(error))
	},
	{ immediate: true },
)

const basePath = computed(() => `/instance/${encodeURIComponent(instanceId.value)}`)

/**
 * Per-route layout mode.
 * - `'scroll'` (default): the whole instance page scrolls inside `.app-viewport`. This lets
 *   `position: sticky` children (and the viewport-rooted `IntersectionObserver` used by
 *   `useStickyObserver`) work correctly.
 * - `'fixed'`: the header + tabs are pinned and only the tab body scrolls in its own container.
 *   Used by tabs whose content (e.g. the log console) needs a bounded height to resolve `h-full`.
 */
const renderMode = computed<'scroll' | 'fixed'>(() =>
	route.meta.renderMode === 'fixed' ? 'fixed' : 'scroll',
)
const isFixedRender = computed(() => renderMode.value === 'fixed')
const tabs = computed(() => {
	const instanceTabs = [
		{
			label: formatMessage(messages.contentTab),
			href: `${basePath.value}`,
			icon: BoxesIcon,
		},
	]

	if (appSettings.showFilesTabInInstances) {
		instanceTabs.push({
			label: formatMessage(messages.filesTab),
			href: `${basePath.value}/files`,
			icon: FolderOpenIcon,
		})
	}

	if (appSettings.showScreenshotsTabInInstances) {
		instanceTabs.push({
			label: formatMessage(messages.screenshotsTab),
			href: `${basePath.value}/screenshots`,
			icon: ImageIcon,
		})
	}

	if (appSettings.showWorldsTabInInstances) {
		instanceTabs.push({
			label: formatMessage(messages.worldsTab),
			href: `${basePath.value}/worlds`,
			icon: GlobeIcon,
		})
	}

	instanceTabs.push({
		label: formatMessage(messages.logsTab),
		href: `${basePath.value}/logs`,
		icon: TerminalSquareIcon,
	})

	return instanceTabs
})

const options = ref<InstanceType<typeof ContextMenu> | null>(null)

const startInstance = async (context: string) => {
	if (!instance.value || instance.value.quarantined) return
	if (loading.value || playing.value || instanceLaunch.isStarting(instance.value.id)) return
	const currentInstance = instance.value
	loading.value = true
	try {
		await instanceLaunch.run(currentInstance.id, async () => {
			await run(currentInstance.id)
			queryClient.setQueryData(instanceKeys.processes(currentInstance.id), [true])
		})
	} catch (err) {
		handleSevereError(err, { instanceId: currentInstance.id })
	}
	loading.value = false

	if (!instance.value) return
	trackEvent('InstanceStart', {
		loader: instance.value.loader,
		game_version: instance.value.game_version,
		source: context,
	})
}

const stopInstance = async (context: string) => {
	const currentInstance = instance.value
	if (!currentInstance) return
	stopping.value = true
	await kill(currentInstance.id).catch((error) => handleError(toError(error)))
	stopping.value = false
	queryClient.setQueryData(instanceKeys.processes(currentInstance.id), [])

	trackEvent('InstanceStop', {
		loader: currentInstance.loader,
		game_version: currentInstance.game_version,
		source: context,
	})
}

function openSettings(tab?: number) {
	settingsModal.value?.show(tab)
}

async function browseContent(projectType?: string) {
	const currentInstance = instance.value
	if (!currentInstance || currentInstance.quarantined) return
	await router.push({
		path: `/browse/${projectType ?? (currentInstance.loader === 'vanilla' ? 'resourcepack' : 'mod')}`,
		query: { i: currentInstance.id },
	})
}

const repairInstance = async () => {
	const currentInstance = instance.value
	if (!currentInstance || currentInstance.quarantined) return
	if (
		currentInstance.install_stage !== 'pack_installed' &&
		currentInstance.link?.type === 'pack_modpack'
	) {
		await install_pack_to_existing_instance(currentInstance.id, {
			type: 'fromVersionId',
			project_id: currentInstance.link.project_id,
			version_id: currentInstance.link.version_id,
			title: currentInstance.name,
		}).catch((error) => handleError(toError(error)))
	} else {
		await install_existing_instance(currentInstance.id, false).catch((error) =>
			handleError(toError(error)),
		)
	}
}

const createShortcut = async () => {
	if (!instance.value || instance.value.quarantined) return
	try {
		const shortcutPath = await createInstanceShortcut(instance.value.name, instance.value.id)
		if (!shortcutPath) return

		addNotification({
			type: 'success',
			title: formatMessage(messages.shortcutCreated),
		})
	} catch (error: unknown) {
		addNotification({
			type: 'error',
			title: formatMessage(messages.shortcutCreationError),
			text: `${error}`,
		})
	}
}

function requestInstanceDeletion() {
	if (!instance.value) return
	selectedInstanceToDelete.value = instance.value
	deleteConfirmModal.value?.show()
}

async function deleteSelectedInstance() {
	const selectedInstance = selectedInstanceToDelete.value
	selectedInstanceToDelete.value = null
	if (!selectedInstance) return

	trackEvent('InstanceRemove', {
		loader: selectedInstance.loader,
		game_version: selectedInstance.game_version,
	})
	await router.push({ path: '/' })
	await remove(selectedInstance.id).catch((error) => handleError(toError(error)))
}

const handleRightClick = (event: MouseEvent) => {
	const canAddContent = !instance.value?.quarantined

	options.value?.open(event, [
		{
			id: 'stop',
			label: formatMessage(messages.stop),
			icon: StopCircleIcon,
			shown: playing.value,
			tone: 'red',
			action: () => void stopInstance('InstancePageContextMenu'),
		},
		{
			id: 'play',
			label: formatMessage(messages.play),
			icon: PlayIcon,
			shown: !playing.value && canAddContent,
			tone: 'brand',
			action: () => void startInstance('InstancePageContextMenu'),
		},
		{
			id: 'add_content',
			label: formatMessage(messages.addContent),
			icon: PlusIcon,
			shown: canAddContent,
			action: () => void browseContent(instance.value?.loader === 'vanilla' ? 'datapack' : 'mod'),
		},
		{ type: 'divider', shown: canAddContent },
		{
			id: 'edit',
			label: formatMessage(messages.edit),
			icon: EditIcon,
			action: () => openSettings(),
		},
		{
			id: 'open_folder',
			label: formatMessage(messages.openFolder),
			icon: FolderOpenIcon,
			action: () => {
				if (instance.value) void showInstanceInFolder(instance.value.id)
			},
		},
		{
			id: 'copy_path',
			label: formatMessage(messages.copyPath),
			icon: ClipboardCopyIcon,
			action: () => void copyInstancePath(),
		},
	])
}

const copyInstancePath = async () => {
	if (!instance.value) return
	const fullPath = await get_full_path(instance.value.id)
	await navigator.clipboard.writeText(fullPath)
}

provideInstancePage({
	instanceId,
	instance: instance as ComputedRef<GameInstance>,
	linkedProject: linkedProjectV3,
	offline,
	playing,
	loading,
	stopping,
	refreshInstance,
	refreshPlayState,
	play: startInstance,
	stop: stopInstance,
	openSettings,
	browseContent,
})
provideInstanceBackup(() => instance.value!)

function destroyInstanceConsole(targetInstanceId: string) {
	void useInstanceConsole(targetInstanceId).destroy()
	queryClient.removeQueries({ queryKey: instanceKeys.console(targetInstanceId), exact: true })
}

watch(instanceId, (currentInstanceId, previousInstanceId) => {
	if (!previousInstanceId || previousInstanceId === currentInstanceId) return
	destroyInstanceConsole(previousInstanceId)
})

useAppEvent('instance', async (event) => {
	if (event.instance_id !== instanceId.value || event.event !== 'removed') return
	if (route.path !== '/') await router.push({ path: '/' })
})

useAppEvent('process', (event) => {
	if (event.instance_id !== instanceId.value) return
	if (event.event === 'finished') {
		queryClient.setQueryData(instanceKeys.processes(event.instance_id), [])
		useInstanceConsole(event.instance_id).invalidate()
		void queryClient.invalidateQueries({ queryKey: instanceKeys.logs(event.instance_id) })
	} else if (event.event === 'launched') {
		queryClient.setQueryData(instanceKeys.processes(event.instance_id), [true])
	}
})

const icon = computed(() => getInstanceIconUrl(instance.value?.icon_path))

const timePlayed = computed(() => {
	return instance.value
		? instance.value.recent_time_played + instance.value.submitted_time_played
		: 0
})

onUnmounted(() => {
	if (instanceId.value) {
		destroyInstanceConsole(instanceId.value)
	}
})
</script>
