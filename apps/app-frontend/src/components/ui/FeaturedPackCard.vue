<script setup lang="ts">
import {
	ChevronDownIcon,
	ChevronUpIcon,
	CopyIcon,
	DownloadIcon,
	ExternalIcon,
	FolderOpenIcon,
	KeyIcon,
	PlayIcon,
	ServerIcon,
	TriangleAlertIcon,
	UndoIcon,
	UpdatedIcon,
} from '@crafton/assets'
import { Button, injectNotificationManager } from '@crafton/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import { openUrl } from '@tauri-apps/plugin-opener'
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import type { FeaturedPack } from '@/config/featured-pack'
import {
	clearAppliedSettings,
	comparePackFiles,
	featured_pack_download,
	featured_pack_github_poll,
	featured_pack_github_start,
	featured_pack_instance_mods,
	featured_pack_latest,
	featured_pack_mod_files,
	featured_pack_remove_mods,
	type FeaturedPackDownload,
	useFeaturedPackAccessKey,
	useFeaturedPackRecord,
	writeFeaturedPackAccessKey,
	writeFeaturedPackRecord as writeRecord,
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

const props = withDefaults(defineProps<{ pack: FeaturedPack; compact?: boolean }>(), {
	compact: false,
})

const repo = props.pack.repo
const record = useFeaturedPackRecord(props.pack.id)
const accessKey = useFeaturedPackAccessKey(props.pack.id)
const token = computed(() => (props.pack.requiresKey ? accessKey.value || null : null))
const keyDraft = ref('')
const editingKey = ref(false)

function writeFeaturedPackRecord(value: Parameters<typeof writeRecord>[1]) {
	writeRecord(props.pack.id, value)
}

function saveKey() {
	writeFeaturedPackAccessKey(props.pack.id, keyDraft.value)
	keyDraft.value = ''
	editingKey.value = false
}

// GitHub sign-in (device flow): the player approves on github.com and the launcher receives a token
// that is stored and used exactly like a pasted access key.
const clientId = props.pack.githubAppClientId ?? ''
const signIn = ref<{ userCode: string; url: string } | null>(null)
const signInError = ref('')
const showKeyBox = ref(!clientId)
let signInRun = 0

async function startSignIn() {
	const run = ++signInRun
	signInError.value = ''
	try {
		const code = await featured_pack_github_start(clientId)
		if (run !== signInRun) return
		signIn.value = { userCode: code.user_code, url: code.verification_uri }
		void openUrl(code.verification_uri)
		let wait = Math.max(code.interval, 5)
		const deadline = Date.now() + code.expires_in * 1000
		while (run === signInRun && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, wait * 1000))
			if (run !== signInRun) return
			const result = await featured_pack_github_poll(clientId, code.device_code)
			if (run !== signInRun) return
			if (result.status === 'authorized') {
				writeFeaturedPackAccessKey(props.pack.id, result.token)
				editingKey.value = false
				signIn.value = null
				return
			}
			if (result.status === 'slow_down') wait += 5
			if (result.status === 'denied') {
				signInError.value = 'The sign-in was cancelled on GitHub.'
				break
			}
			if (result.status === 'expired') break
		}
		if (run !== signInRun) return
		signIn.value = null
		if (!signInError.value) signInError.value = 'The sign-in code expired. Try again.'
	} catch (error) {
		if (run !== signInRun) return
		signIn.value = null
		handleError(error as Error)
	}
}

function cancelSignIn() {
	signInRun++
	signIn.value = null
}

function copySignInCode() {
	if (signIn.value) void navigator.clipboard.writeText(signIn.value.userCode)
}

onUnmounted(cancelSignIn)

const router = useRouter()
const queryClient = useQueryClient()
const { handleError } = injectNotificationManager()
const appEvents = injectAppEvents()

const releaseQuery = useQuery({
	// The key itself stays out of the query key: a saved change refetches through the watcher below.
	queryKey: computed(() => ['featured-pack', repo, !!token.value]),
	queryFn: () => featured_pack_latest(repo, token.value),
	enabled: computed(() => !props.pack.requiresKey || !!token.value),
	staleTime: 1000 * 60 * 10,
	retry: 1,
})
watch(token, (value, previous) => {
	if (value && previous && value !== previous) releaseQuery.refetch()
})
const release = computed(() => releaseQuery.data.value ?? null)
const keyRejected = computed(
	() => !!props.pack.requiresKey && !!token.value && releaseQuery.isError.value,
)
const needsKey = computed(
	() => !!props.pack.requiresKey && (!token.value || keyRejected.value || editingKey.value),
)

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
const title = computed(
	() => installedInstance.value?.name ?? release.value?.name ?? props.pack.name,
)
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
		const download = await featured_pack_download(repo, token.value)
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
	const download = await featured_pack_download(repo, token.value)
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
			const download = await featured_pack_download(repo, token.value)
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
		v-if="release || installedInstance || needsKey"
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
				<template v-if="!installedInstance && !release" />
				<template v-else-if="!installedInstance">
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

		<div
			v-if="needsKey"
			class="flex flex-wrap items-center gap-2 rounded-xl bg-surface-3 p-3 text-sm"
		>
			<KeyIcon class="shrink-0 text-brand" />
			<template v-if="signIn">
				<span class="grow text-primary">
					Enter this code on GitHub to sign in:
					<span class="select-all font-mono text-base font-bold text-contrast">
						{{ signIn.userCode }}
					</span>
				</span>
				<Button @click="copySignInCode">
					<CopyIcon />
					Copy code
				</Button>
				<Button @click="openUrl(signIn.url)">
					<ExternalIcon />
					Open GitHub
				</Button>
				<Button @click="cancelSignIn">Cancel</Button>
			</template>
			<template v-else>
				<span class="grow text-primary">
					<template v-if="signInError">{{ signInError }}</template>
					<template v-else-if="keyRejected">
						This account or access key can't open the modpack. Ask the server owner for access.
					</template>
					<template v-else-if="clientId">
						This modpack is private. Sign in with the GitHub account the server owner invited.
					</template>
					<template v-else>
						This modpack is private. Enter the access key the server owner gave you.
					</template>
				</span>
				<Button v-if="clientId" type="colored" color="brand" @click="startSignIn">
					Sign in with GitHub
				</Button>
				<template v-if="showKeyBox">
					<input
						v-model="keyDraft"
						type="password"
						autocomplete="off"
						spellcheck="false"
						placeholder="Access key"
						class="w-64"
						@keyup.enter="keyDraft.trim() && saveKey()"
					/>
					<Button
						:type="clientId ? 'base' : 'colored'"
						:color="clientId ? undefined : 'brand'"
						:disabled="!keyDraft.trim()"
						@click="saveKey"
					>
						Save key
					</Button>
				</template>
				<button
					v-else
					class="cursor-pointer border-none bg-transparent p-0 text-xs text-secondary underline"
					@click="showKeyBox = true"
				>
					Use an access key instead
				</button>
				<Button v-if="editingKey" @click="editingKey = false">Cancel</Button>
			</template>
		</div>
		<button
			v-else-if="props.pack.requiresKey"
			class="flex cursor-pointer items-center gap-1 self-start border-none bg-transparent p-0 text-xs text-secondary"
			@click="editingKey = true"
		>
			<KeyIcon />
			{{ clientId ? 'Change sign-in' : 'Change access key' }}
		</button>

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
