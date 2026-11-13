import { invoke } from '@tauri-apps/api/core'
import { type Ref, ref } from 'vue'

import { edit, get } from '@/helpers/instance'

export interface FeaturedPackRelease {
	tag: string
	name: string
	notes?: string | null
	published_at?: string | null
	asset_name: string
}

export interface FeaturedPackDownload {
	release: FeaturedPackRelease
	path: string
}

export interface FeaturedPackRecord {
	instanceId: string
	tag: string
	applied?: { memory_mb?: number | null; java_args?: string[] }
	packFiles?: string[]
}

export interface PackDrift {
	added: string[]
	missing: string[]
	disabled: string[]
}

/** The first pack keeps the key it always had, so existing installs are still recognised. */
const LEGACY_PACK_ID = 'workshop-smp'
const RECORD_KEY = 'crafton.featuredPack'
const ACCESS_KEY = 'crafton.featuredPackKey'

function recordKey(packId: string) {
	return packId === LEGACY_PACK_ID ? RECORD_KEY : `${RECORD_KEY}.${packId}`
}

export async function featured_pack_latest(repo: string, token?: string | null) {
	return await invoke<FeaturedPackRelease | null>('plugin:utils|featured_pack_latest', {
		repo,
		token: token || null,
	})
}

export async function featured_pack_download(repo: string, token?: string | null) {
	return await invoke<FeaturedPackDownload>('plugin:utils|featured_pack_download', {
		repo,
		token: token || null,
	})
}

export interface GithubDeviceCode {
	device_code: string
	user_code: string
	verification_uri: string
	expires_in: number
	interval: number
}

export type GithubDevicePoll =
	| { status: 'pending' | 'slow_down' | 'expired' | 'denied' }
	| { status: 'authorized'; token: string }

export async function featured_pack_github_start(clientId: string) {
	return await invoke<GithubDeviceCode>('plugin:utils|featured_pack_github_start', { clientId })
}

export async function featured_pack_github_poll(clientId: string, deviceCode: string) {
	return await invoke<GithubDevicePoll>('plugin:utils|featured_pack_github_poll', {
		clientId,
		deviceCode,
	})
}

export async function featured_pack_mod_files(path: string) {
	return await invoke<string[]>('plugin:utils|featured_pack_mod_files', { path })
}

export async function featured_pack_instance_mods(instanceId: string) {
	return await invoke<string[]>('plugin:utils|featured_pack_instance_mods', { instanceId })
}

export async function featured_pack_remove_mods(instanceId: string, files: string[]) {
	return await invoke<void>('plugin:utils|featured_pack_remove_mods', { instanceId, files })
}

export function comparePackFiles(packFiles: string[], instanceFiles: string[]): PackDrift {
	const pack = new Set(packFiles)
	const present = new Set(instanceFiles)
	const added: string[] = []
	const disabled: string[] = []
	for (const file of instanceFiles) {
		if (pack.has(file)) continue
		if (file.endsWith('.disabled') && pack.has(file.slice(0, -'.disabled'.length))) {
			disabled.push(file)
		} else {
			added.push(file)
		}
	}
	const missing = packFiles.filter((file) => !present.has(file) && !present.has(`${file}.disabled`))
	return { added, missing, disabled }
}

function readFeaturedPackRecord(packId: string): FeaturedPackRecord | null {
	try {
		const raw = window.localStorage.getItem(recordKey(packId))
		if (!raw) return null
		const record = JSON.parse(raw) as Partial<FeaturedPackRecord>
		return record.instanceId && record.tag
			? {
					instanceId: record.instanceId,
					tag: record.tag,
					applied: record.applied,
					packFiles: record.packFiles,
				}
			: null
	} catch {
		return null
	}
}

const records = new Map<string, Ref<FeaturedPackRecord | null>>()

/** What is installed for one pack. The same ref is returned for the same pack everywhere. */
export function useFeaturedPackRecord(packId: string): Ref<FeaturedPackRecord | null> {
	let record = records.get(packId)
	if (!record) {
		record = ref<FeaturedPackRecord | null>(readFeaturedPackRecord(packId))
		records.set(packId, record)
	}
	return record
}

export function writeFeaturedPackRecord(packId: string, record: FeaturedPackRecord) {
	useFeaturedPackRecord(packId).value = record
	try {
		window.localStorage.setItem(recordKey(packId), JSON.stringify(record))
	} catch {
		return
	}
}

const accessKeys = new Map<string, Ref<string>>()

/**
 * Access key for a private pack. It is typed in by the player and only ever kept on this computer;
 * it is sent to GitHub with the release check and the download, nowhere else.
 */
export function useFeaturedPackAccessKey(packId: string): Ref<string> {
	let key = accessKeys.get(packId)
	if (!key) {
		let stored = ''
		try {
			stored = window.localStorage.getItem(`${ACCESS_KEY}.${packId}`) ?? ''
		} catch {
			stored = ''
		}
		key = ref(stored)
		accessKeys.set(packId, key)
	}
	return key
}

export function writeFeaturedPackAccessKey(packId: string, value: string) {
	const trimmed = value.trim()
	useFeaturedPackAccessKey(packId).value = trimmed
	try {
		if (trimmed) {
			window.localStorage.setItem(`${ACCESS_KEY}.${packId}`, trimmed)
		} else {
			window.localStorage.removeItem(`${ACCESS_KEY}.${packId}`)
		}
	} catch {
		return
	}
}

function sameArgs(a: string[] | undefined, b: string[] | undefined) {
	return !!a && !!b && a.length === b.length && a.every((arg, i) => arg === b[i])
}

export async function clearAppliedSettings(
	instanceId: string,
	applied: FeaturedPackRecord['applied'],
): Promise<void> {
	if (!applied) return
	const instance = await get(instanceId)
	if (!instance) return

	const changes: Parameters<typeof edit>[1] = {}
	if (applied.memory_mb && instance.memory?.maximum === applied.memory_mb) {
		changes.memory = null
	}
	if (applied.java_args?.length && sameArgs(instance.extra_launch_args, applied.java_args)) {
		changes.extra_launch_args = null
	}

	if (Object.keys(changes).length > 0) {
		await edit(instanceId, changes)
	}
}
