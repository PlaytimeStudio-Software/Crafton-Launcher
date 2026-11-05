<script setup lang="ts">
import { DownloadIcon, PlayIcon, UpdatedIcon } from '@crafton/assets'
import { Button, injectNotificationManager } from '@crafton/ui'
import { useQuery } from '@tanstack/vue-query'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { FEATURED_PACK_REPO } from '@/config/featured-pack'
import {
	applyRecommendedSettings,
	featured_pack_download,
	featured_pack_latest,
	featuredPackRecord as record,
	writeFeaturedPackRecord,
} from '@/helpers/featured-pack'
import {
	install_create_modpack_instance,
	install_pack_to_existing_instance,
	installJobInstanceId,
	wait_for_install_job,
} from '@/helpers/install'
import type { GameInstance } from '@/helpers/types'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import { injectAppEvents } from '@/providers/app-events'
import CraftonLogo from '@/shared/branding/crafton-logo.vue'

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false })

const router = useRouter()
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
const updateAvailable = computed(
	() => !!installedInstance.value && !!release.value && release.value.tag !== record.value?.tag,
)
const title = computed(() => installedInstance.value?.name ?? release.value?.name ?? '')

const busy = ref(false)

async function installPack() {
	busy.value = true
	try {
		const download = await featured_pack_download(FEATURED_PACK_REPO)
		const job = await install_create_modpack_instance({ type: 'fromFile', path: download.path })
		const instanceId = installJobInstanceId(job)
		if (instanceId) {
			writeFeaturedPackRecord({ instanceId, tag: download.release.tag })
			await wait_for_install_job(appEvents, job.job_id)
			const applied = await applyRecommendedSettings(instanceId, download.settings, undefined)
			writeFeaturedPackRecord({ instanceId, tag: download.release.tag, applied })
		}
	} catch (error) {
		handleError(error as Error)
	} finally {
		busy.value = false
	}
}

async function updatePack() {
	const instance = installedInstance.value
	if (!instance) return
	busy.value = true
	try {
		const download = await featured_pack_download(FEATURED_PACK_REPO)
		const job = await install_pack_to_existing_instance(instance.id, {
			type: 'fromFile',
			path: download.path,
		})
		await wait_for_install_job(appEvents, job.job_id)
		const applied = await applyRecommendedSettings(
			instance.id,
			download.settings,
			record.value?.applied,
		)
		writeFeaturedPackRecord({ instanceId: instance.id, tag: download.release.tag, applied })
	} catch (error) {
		handleError(error as Error)
	} finally {
		busy.value = false
	}
}

function openPack() {
	if (installedInstance.value) {
		router.push(`/instance/${encodeURIComponent(installedInstance.value.id)}`)
	}
}
</script>

<template>
	<div
		v-if="release || installedInstance"
		class="flex items-center gap-4 rounded-2xl border border-solid border-surface-5 bg-bg-raised p-4"
		:class="props.compact ? 'w-[min(32rem,90vw)]' : 'w-full'"
	>
		<CraftonLogo icon-only class="size-16 shrink-0" />
		<div class="flex min-w-0 grow flex-col gap-1">
			<span class="text-xs font-semibold uppercase tracking-wide text-brand">Server modpack</span>
			<span class="font-heading truncate text-xl text-contrast">{{ title }}</span>
			<span class="text-sm text-secondary">
				<template v-if="updateAvailable">Update available: {{ release?.tag }}</template>
				<template v-else-if="installedInstance">Installed: {{ record?.tag }}</template>
				<template v-else-if="release">Latest version: {{ release.tag }}</template>
			</span>
		</div>
		<Button
			v-if="updateAvailable"
			type="colored"
			color="brand"
			:disabled="busy"
			@click="updatePack"
		>
			<UpdatedIcon />
			{{ busy ? 'Updating...' : 'Update' }}
		</Button>
		<Button v-else-if="installedInstance" type="colored" color="brand" @click="openPack">
			<PlayIcon />
			Open
		</Button>
		<Button v-else type="colored" color="brand" :disabled="busy" @click="installPack">
			<DownloadIcon />
			{{ busy ? 'Installing...' : 'Install' }}
		</Button>
	</div>
</template>
