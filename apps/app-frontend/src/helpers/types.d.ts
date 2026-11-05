import type { IconConfig } from '@crafton/api-client'
import type { ContentId } from '@crafton/utils'

export type GameInstance = {
	id: string
	path: string
	install_stage: InstallStage
	launcher_feature_version: string

	name: string
	icon_path?: string
	icon_config?: IconConfig | null

	game_version: string
	protocol_version?: number
	loader: InstanceLoader
	loader_version?: string

	group_ids: string[]
	synced_options: {
		resource_packs: boolean
		data_packs: boolean
		game_options: boolean
		command_history: boolean
		multiplayer_servers: boolean
		creative_hotbars: boolean
		screenshots: boolean
	}

	link?: InstanceLink | null
	quarantined: boolean
	update_channel: ReleaseChannel

	created: Date
	modified: Date
	last_played?: Date

	submitted_time_played: number
	recent_time_played: number

	java_path?: string
	extra_launch_args?: string[]
	custom_env_vars?: [string, string][]

	memory?: MemorySettings
	force_fullscreen?: boolean
	game_resolution?: [number, number]
	hooks: Hooks
	visible_tabs: {
		files: boolean
		worlds: boolean
		screenshots: boolean
	}
}

type InstallStage =
	| 'installed'
	| 'minecraft_installing'
	| 'pack_installed'
	| 'pack_installing'
	| 'not_installed'

type InstanceLinkIdentity = {
	project_id?: ContentId | null
	version_id?: ContentId | null
}

export type InstanceLink = InstanceLinkIdentity &
	(
		| {
				type: 'pack_modpack'
				project_id: ContentId
				version_id: ContentId
		  }
		| {
				type: 'imported_modpack'
				project_id?: ContentId | null
				version_id?: ContentId | null
				name?: string | null
				version_number?: string | null
				filename?: string | null
		  }
	)

export type Instance = GameInstance

type ReleaseChannel = 'release' | 'beta' | 'alpha'

export type InstanceLoader = 'vanilla' | 'forge' | 'fabric' | 'quilt' | 'neoforge'

export type ContentSourceKind =
	| 'local'
	| 'modrinth_modpack'
	| 'server_project'
	| 'modrinth_hosting'
	| 'imported_modpack'
	| 'shared_instance'

export type ContentFile = {
	enabled: boolean
	locked: boolean
	source_kind?: ContentSourceKind | null
	metadata?: {
		project_id: string
		version_id: string
	}
}

export type ContentFileProjectType = 'mod' | 'datapack' | 'resourcepack' | 'shaderpack'

export type CacheBehaviour =
	// Serve expired data. If fetch fails / launcher is offline, errors are ignored
	| 'stale_while_revalidate_skip_offline'
	// Serve expired data, revalidate in background
	| 'stale_while_revalidate'
	// Must revalidate if data is expired
	| 'must_revalidate'
	// Ignore cache- always fetch updated data from origin
	| 'bypass'

type MemorySettings = {
	maximum: number
}

export type WindowSize = [number, number]

type Hooks = {
	pre_launch?: string
	wrapper?: string
	post_exit?: string
}

export type Manifest = {
	gameVersions: ManifestGameVersion[]
	versionGroups?: ManifestVersionGroup[]
}

type ManifestGameVersion = {
	id: string
	stable: boolean
	versionGroup?: string
	loaders: ManifestLoaderVersion[]
}

type ManifestVersionGroup = {
	id: string
	loaders: ManifestLoaderVersion[]
}

type ManifestLoaderVersion = {
	id: string
	url: string
	stable: boolean
}

export type AppSettings = {
	max_concurrent_downloads: number
	max_concurrent_writes: number

	theme:
		| 'dark'
		| 'grass'
		| 'ender'
		| 'lapis'
		| 'netherite'
		| 'deepslate'
		| 'skyline'
		| 'aurora'
		| 'oled'
		| 'retro'
		| 'system'
	default_page: 'Home' | 'Library'
	collapsed_navigation: boolean
	advanced_rendering: boolean
	native_decorations: boolean
	worlds_in_home: boolean
	sync_theme_across_devices: boolean
	sync_behavior_across_devices: boolean
	sync_features_across_devices: boolean
	show_files_tab_in_instances: boolean
	show_worlds_tab_in_instances: boolean
	show_screenshots_tab_in_instances: boolean
	show_skin_selector_in_sidebar: boolean

	telemetry: boolean
	discord_rpc: boolean
	developer_mode: boolean
	personalized_ads: boolean

	extra_launch_args: string[]
	custom_env_vars: [string, string][]
	memory: MemorySettings
	force_fullscreen: boolean
	game_resolution: [number, number]
	hide_on_process_start: boolean
	show_jump_in: boolean
	always_show_copy_details: boolean
	hide_installed_modpacks: boolean
	advanced_filters_collapsed: boolean
	dismissed_photosensitivity_filter_warning: boolean
	refocus_on_game_close: boolean
	compact_instance_cards: boolean
	show_play_time: boolean
	warn_on_unknown_modpacks: boolean
	skip_non_essential_warnings: boolean
	hooks: Hooks

	custom_dir?: string
	prev_custom_dir?: string
	migrated: boolean
}
