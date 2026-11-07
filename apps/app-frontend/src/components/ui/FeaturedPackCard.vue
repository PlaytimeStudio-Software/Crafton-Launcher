<script setup lang="ts">
import {
	ChevronDownIcon,
	ChevronUpIcon,
	DownloadIcon,
	FolderOpenIcon,
	PlayIcon,
	ServerIcon,
	TriangleAlertIcon,
	UndoIcon,
	UpdatedIcon,
} from '@crafton/assets'
import { Button, injectNotificationManager } from '@crafton/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { FEATURED_PACK_REPO } from '@/config/featured-pack'
import {
	clearAppliedSettings,
	comparePackFiles,
	featured_pack_download,
	featured_pack_instance_mods,
	featured_pack_latest,
	featured_pack_mod_files,
	featured_pack_remove_mods,
	type FeaturedPackDownload,
	featuredPackRecord as record,
	writeFeaturedPackRecord,
} from '@/helpers/featured-pack'
import {
	install_create_modpack_instance,
	install_pack_to_existing_instance,
	installJobInstanceId,
	wait_for_install_job,
} from '@/helpers/install'
import { run } from '@/helpers/instance'
import type { GameInstance } from '@/helpers/types'
import {
	get_instance_worlds,
	get_server_status,
	isServerWorld,
	start_join_server,
} from '@/helpers/worlds'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import { injectAppEvents } from '@/providers/app-events'
import CraftonLogo from '@/shared/branding/crafton-logo.vue'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const router = useRouter()
const queryClient = useQueryClient()
const { handleError } = injectNotificationManager()
const appEvents = injectAppEvents()

const releaseQuery = useQuery({
	queryKey: ['featured-pack', FEATURED_PACK_REPO],
	queryFn: () => featured_pack_latest(FEATURED_PACK_REPO),
	staleTime: 1000 * 60 * 10,
	retry: 1,
})
const release = computed(() => releaseQuery.data.value ?? null)

const instancesQuery = useQuery(instanceListQueryOptions())
const installedInstance = computed(() => {
	const id = record.value?.instanceId
	if (!id) return null
	return ((instancesQuery.data.value ?? []) as GameInstance[]).find((i) => i.id === id) ?? null
})
const instanceId = computed(() => installedInstance.value?.id ?? null)
const updateAvailable = computed(
	() => !!installedInstance.value && !!release.value && release.value.tag !== record.value?.tag,
)
const title = computed(() => installedInstance.value?.name ?? release.value?.name ?? '')
const releaseNotes = computed(() => release.value?.notes?.trim() || '')

const serverQuery = useQuery({
	queryKey: computed(() => ['featured-pack-server', instanceId.value]),
	queryFn: async () => {
		const worlds = await get_instance_worlds(instanceId.value!)
		const server = worlds.filter(isServerWorld).find((world) => world.address.trim())
		return server ? { name: server.name, address: server.address.trim() } : null
	},
	enabled: computed(() => !!instanceId.value),
	staleTime: 1000 * 30,
})
const server = computed(() => serverQuery.data.value ?? null)

const statusQuery = useQuery({
	queryKey: computed(() => ['featured-pack-server-status', server.value?.address]),
	queryFn: () => get_server_status(server.value!.address),
	enabled: computed(() => !!server.value),
	refetchInterval: 1000 * 60,
	retry: false,
})
const serverOnline = computed(() => !!statusQuery.data.value && !statusQuery.isError.value)
const players = computed(() => statusQuery.data.value?.players)

const instanceReady = computed(() => installedInstance.value?.install_stage === 'installed')
const driftQuery = useQuery({
	queryKey: computed(() => [
		'featured-pack-drift',
		instanceId.value,
		record.value?.tag,
		instanceReady.value,
	]),
	queryFn: async () =>
		comparePackFiles(
			record.value?.packFiles ?? [],
			await featured_pack_instance_mods(instanceId.value!),
		),
	enabled: computed(
		() => !!instanceId.value && instanceReady.value && !!record.value?.packFiles?.length,
	),
	staleTime: 1000 * 30,
})
const driftCount = computed(() => {
	const drift = driftQuery.data.value
	return drift ? drift.added.length + drift.missing.length + drift.disabled.length : 0
})
const showDrift = computed(() => driftCount.value > 0 && !updateAvailable.value)

const busy = ref(false)
const showNotes = ref(false)
const confirmReset = ref(false)

async function packFilesFor(download: FeaturedPackDownload) {
	try {
		return await featured_pack_mod_files(download.path)
	} catch {
		return undefined
	}
}

function refreshInstanceQueries() {
	queryClient.invalidateQueries({ queryKey: ['featured-pack-drift'] })
	queryClient.invalidateQueries({ queryKey: ['featured-pack-server'] })
}

async function installPack() {
	busy.value = true
	try {
		const download = await featured_pack_download(FEATURED_PACK_REPO)
		const packFiles = await packFilesFor(download)
		const job = await install_create_modpack_instance({ type: 'fromFile', path: download.path })
		const newInstanceId = installJobInstanceId(job)
		if (newInstanceId) {
			writeFeaturedPackRecord({ instanceId: newInstanceId, tag: download.release.tag, packFiles })
			await wait_for_install_job(appEvents, job.job_id)
		}
	} catch (error) {
		handleError(error as Error)
	} finally {
		busy.value = false
		refreshInstanceQueries()
	}
}

async function reinstallPack() {
	const instance = installedInstance.value
	if (!instance) return
	const download = await featured_pack_download(FEATURED_PACK_REPO)
	const packFiles = await packFilesFor(download)
	const job = await install_pack_to_existing_instance(instance.id, {
		type: 'fromFile',
		path: download.path,
	})
	await wait_for_install_job(appEvents, job.job_id)
	await clearAppliedSettings(instance.id, record.value?.applied)
	writeFeaturedPackRecord({
		instanceId: instance.id,
		tag: download.release.tag,
		packFiles: packFiles ?? record.value?.packFiles,
	})
}

async function updatePack() {
	busy.value = true
	try {
		await reinstallPack()
		showNotes.value = false
	} catch (error) {
		handleError(error as Error)
	} finally {
		busy.value = false
		refreshInstanceQueries()
	}
}

async function resetPack() {
	const instance = installedInstance.value
	const drift = driftQuery.data.value
	if (!instance || !drift) return
	busy.value = true
	try {
		await featured_pack_remove_mods(instance.id, [...drift.added, ...drift.disabled])
		await reinstallPack()
	} catch (error) {
		handleError(error as Error)
	} finally {
		busy.value = false
		confirmReset.value = false
		refreshInstanceQueries()
	}
}

async function launch(join: boolean) {
	const instance = installedInstance.value
	if (!instance) return
	try {
		if (join && server.value) {
			await start_join_server(instance.id, server.value.address)
		} else {
			await run(instance.id)
		}
		router.push(`/instance/${encodeURIComponent(instance.id)}`)
	} catch (error) {
		handleError(error as Error)
	}
}

function openPack() {
	if (installedInstance.value) {
		router.push(`/instance/${encodeURIComponent(installedInstance.value.id)}`)
	}
}

watch(
	installedInstance,
	async (instance) => {
		const applied = record.value?.applied
		if (!instance || !applied || !record.value) return
		try {
			await clearAppliedSettings(instance.id, applied)
			const { applied: _, ...rest } = record.value
			writeFeaturedPackRecord(rest)
		} catch {
			return
		}
	},
	{ immediate: true },
)

watch(
	[installedInstance, updateAvailable],
	async ([instance, outdated]) => {
		if (!instance || outdated || record.value?.packFiles || busy.value) return
		try {
			const download = await featured_pack_download(FEATURED_PACK_REPO)
			if (download.release.tag !== record.value?.tag) return
			const packFiles = await packFilesFor(download)
			if (packFiles && record.value) {
				writeFeaturedPackRecord({ ...record.value, packFiles })
			}
		} catch {
			return
		}
	},
	{ immediate: true },
)
</script>

<template>
	<div
		v-if="release || installedInstance"
		class="flex flex-col gap-3 rounded-2xl border border-solid border-surface-5 bg-bg-raised p-4"
		:class="props.compact ? 'w-[min(32rem,90vw)]' : 'w-full'"
	>
		<div class="flex items-center gap-4">
			<CraftonLogo icon-only class="size-16 shrink-0" />
			<div class="flex min-w-0 grow flex-col gap-1">
				<span class="text-xs font-semibold uppercase tracking-wide text-brand">Server modpack</span>
				<span class="font-heading truncate text-xl text-contrast">{{ title }}</span>
				<span class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-secondary">
					<span v-if="updateAvailable">Update available: {{ release?.tag }}</span>
					<span v-else-if="installedInstance">Installed: {{ record?.tag }}</span>
					<span v-else-if="release">Latest version: {{ release.tag }}</span>
					<span v-if="server" class="flex items-center gap-1.5">
						<span
							class="inline-block size-2 rounded-full"
							:class="serverOnline ? 'bg-brand-green' : 'bg-surface-5'"
						/>
						<template v-if="statusQuery.isPending.value">Checking server</template>
						<template v-else-if="serverOnline">
							Online
							<template v-if="players">· {{ players.online }}/{{ players.max }} players</template>
						</template>
						<template v-else>Server offline</template>
					</span>
				</span>
			</div>
			<div class="flex shrink-0 items-center gap-2">
				<template v-if="!installedInstance">
					<Button type="colored" color="brand" :disabled="busy" @click="installPack">
						<DownloadIcon />
						{{ busy ? 'Installing...' : 'Install' }}
					</Button>
				</template>
				<template v-else-if="updateAvailable">
					<Button type="colored" color="brand" :disabled="busy" @click="updatePack">
						<UpdatedIcon />
						{{ busy ? 'Updating...' : 'Update' }}
					</Button>
				</template>
				<template v-else>
					<Button
						v-if="server"
						type="colored"
						color="brand"
						:disabled="busy || !serverOnline"
						@click="launch(true)"
					>
						<ServerIcon />
						Join
					</Button>
					<Button
						:type="server ? 'base' : 'colored'"
						:color="server ? undefined : 'brand'"
						:disabled="busy"
						@click="launch(false)"
					>
						<PlayIcon />
						Play
					</Button>
					<Button v-tooltip="'Open instance'" :disabled="busy" @click="openPack">
						<FolderOpenIcon />
					</Button>
				</template>
			</div>
		</div>

		<div v-if="updateAvailable" class="flex flex-col gap-2 rounded-xl bg-surface-3 p-3 text-sm">
			<div class="flex flex-wrap items-center gap-2">
				<TriangleAlertIcon class="shrink-0 text-orange" />
				<span class="grow text-primary">
					Your pack is out of date. Update before joining the server.
				</span>
				<button
					v-if="releaseNotes"
					class="flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-sm text-brand"
					@click="showNotes = !showNotes"
				>
					What's new
					<ChevronUpIcon v-if="showNotes" />
					<ChevronDownIcon v-else />
				</button>
				<Button type="outlined" :disabled="busy" @click="launch(false)">Play anyway</Button>
			</div>
			<p v-if="showNotes" class="m-0 max-h-48 overflow-y-auto whitespace-pre-line text-secondary">
				{{ releaseNotes }}
			</p>
		</div>

		<div
			v-else-if="showDrift"
			class="flex flex-wrap items-center gap-2 rounded-xl bg-surface-3 p-3 text-sm"
		>
			<TriangleAlertIcon class="shrink-0 text-orange" />
			<span class="grow text-primary">
				{{ driftCount }} {{ driftCount === 1 ? 'mod differs' : 'mods differ' }} from the pack.
				Joining the server may fail.
			</span>
			<Button v-if="!confirmReset" type="outlined" :disabled="busy" @click="confirmReset = true">
				<UndoIcon />
				Reset to pack
			</Button>
			<template v-else>
				<span class="text-secondary">Removes added mods and restores the pack.</span>
				<Button type="colored" color="red" :disabled="busy" @click="resetPack">
					{{ busy ? 'Resetting...' : 'Confirm reset' }}
				</Button>
				<Button :disabled="busy" @click="confirmReset = false">Cancel</Button>
			</template>
		</div>
	</div>
</template>
