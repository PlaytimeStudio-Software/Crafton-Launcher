import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'

import { edit, get } from '@/helpers/instance'
import { get_max_memory } from '@/helpers/jre'

export interface FeaturedPackRelease {
	tag: string
	name: string
	notes?: string | null
	published_at?: string | null
	asset_name: string
}

export interface FeaturedPackSettings {
	memory_mb?: number | null
	java_args?: string[]
}

export interface FeaturedPackDownload {
	release: FeaturedPackRelease
	settings?: FeaturedPackSettings | null
	path: string
}

export interface FeaturedPackRecord {
	instanceId: string
	tag: string
	applied?: { memory_mb?: number | null; java_args?: string[] }
}

const RECORD_KEY = 'crafton.featuredPack'

export async function featured_pack_latest(repo: string) {
	return await invoke<FeaturedPackRelease | null>('plugin:utils|featured_pack_latest', { repo })
}

export async function featured_pack_download(repo: string) {
	return await invoke<FeaturedPackDownload>('plugin:utils|featured_pack_download', { repo })
}

function readFeaturedPackRecord(): FeaturedPackRecord | null {
	try {
		const raw = window.localStorage.getItem(RECORD_KEY)
		if (!raw) return null
		const record = JSON.parse(raw) as Partial<FeaturedPackRecord>
		return record.instanceId && record.tag
			? { instanceId: record.instanceId, tag: record.tag, applied: record.applied }
			: null
	} catch {
		return null
	}
}

export const featuredPackRecord = ref<FeaturedPackRecord | null>(readFeaturedPackRecord())

export function writeFeaturedPackRecord(record: FeaturedPackRecord) {
	featuredPackRecord.value = record
	try {
		window.localStorage.setItem(RECORD_KEY, JSON.stringify(record))
	} catch {
		return
	}
}

const RESERVED_SYSTEM_MEMORY_MB = 3072
const MIN_MEMORY_MB = 2048

function sameArgs(a: string[] | undefined, b: string[] | undefined) {
	return !!a && !!b && a.length === b.length && a.every((arg, i) => arg === b[i])
}

export async function applyRecommendedSettings(
	instanceId: string,
	settings: FeaturedPackSettings | null | undefined,
	previous: FeaturedPackRecord['applied'],
): Promise<FeaturedPackRecord['applied']> {
	if (!settings) return previous
	const instance = await get(instanceId)
	if (!instance) return previous

	const changes: Parameters<typeof edit>[1] = {}
	const applied: NonNullable<FeaturedPackRecord['applied']> = { ...previous }

	if (settings.memory_mb) {
		const current = instance.memory?.maximum
		if (current === undefined || current === previous?.memory_mb) {
			let memory = settings.memory_mb
			try {
				const totalMb = Math.floor(Number(await get_max_memory()) / 1024)
				if (totalMb > 0) {
					memory = Math.min(memory, Math.max(MIN_MEMORY_MB, totalMb - RESERVED_SYSTEM_MEMORY_MB))
				}
			} catch {
				memory = settings.memory_mb
			}
			changes.memory = { maximum: memory }
			applied.memory_mb = memory
		}
	}

	const args = settings.java_args?.filter((arg) => arg.trim()) ?? []
	if (args.length > 0) {
		const current = instance.extra_launch_args
		if (!current?.length || sameArgs(current, previous?.java_args)) {
			changes.extra_launch_args = args
			applied.java_args = args
		}
	}

	if (Object.keys(changes).length > 0) {
		await edit(instanceId, changes)
	}
	return applied
}
