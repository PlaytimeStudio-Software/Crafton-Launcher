import type { AbstractContentClient } from '../core/abstract-client'
import type { AbstractModule } from '../core/abstract-module'
import { ContentVersionsV2Module, ContentVersionsV3Module } from './content'
import { ContentCollectionsModule } from './content/collections'
import { ContentContentV3Module } from './content/content/v3'
import { ContentGlobalsInternalModule } from './content/globals/internal'
import { ContentImagesV3Module } from './content/images/v3'
import { ContentNotificationsV2Module } from './content/notifications/v2'
import { ContentOrganizationsV3Module } from './content/organizations/v3'
import { ContentProjectsV2Module } from './content/projects/v2'
import { ContentProjectsV3Module } from './content/projects/v3'
import { ContentTagsV2Module } from './content/tags/v2'
import { ContentTeamsV2Module } from './content/teams/v2'
import { ContentTeamsV3Module } from './content/teams/v3'
import { ContentThreadsV3Module } from './content/threads/v3'
import { ContentUsersV2Module } from './content/users/v2'
import { ContentUsersV3Module } from './content/users/v3'
import { ISO3166Module } from './iso3166'
import { LauncherMetaManifestV0Module } from './launcher-meta/v0'
import { MclogsInsightsV1Module } from './mclogs/insights/v1'
import { MclogsLogsV1Module } from './mclogs/logs/v1'
import { PaperVersionsV3Module } from './paper/v3'
import { PurpurVersionsV2Module } from './purpur/v2'

type ModuleConstructor = new (client: AbstractContentClient) => AbstractModule

/**
 * To add a new module:
 * 1. Create your module class extending AbstractModule
 * 2. Add one line here: `<api>_<module>: YourModuleClass`
 *
 * TypeScript will automatically infer the client's field structure from this registry.
 *
 * TODO: Better way? Probably not
 */
export const MODULE_REGISTRY = {
	iso3166_data: ISO3166Module,
	mclogs_insights_v1: MclogsInsightsV1Module,
	mclogs_logs_v1: MclogsLogsV1Module,
	launchermeta_manifest_v0: LauncherMetaManifestV0Module,
	content_collections: ContentCollectionsModule,
	content_content_v3: ContentContentV3Module,
	content_globals_internal: ContentGlobalsInternalModule,
	content_images_v3: ContentImagesV3Module,
	content_notifications_v2: ContentNotificationsV2Module,
	content_organizations_v3: ContentOrganizationsV3Module,
	content_projects_v2: ContentProjectsV2Module,
	content_projects_v3: ContentProjectsV3Module,
	content_tags_v2: ContentTagsV2Module,
	content_teams_v2: ContentTeamsV2Module,
	content_teams_v3: ContentTeamsV3Module,
	content_threads_v3: ContentThreadsV3Module,
	content_users_v2: ContentUsersV2Module,
	content_users_v3: ContentUsersV3Module,
	content_versions_v2: ContentVersionsV2Module,
	content_versions_v3: ContentVersionsV3Module,
	paper_versions_v3: PaperVersionsV3Module,
	purpur_versions_v2: PurpurVersionsV2Module,
} as const satisfies Record<string, ModuleConstructor>

export type ModuleID = keyof typeof MODULE_REGISTRY

/**
 * Parse a module ID into [api, moduleName] tuple
 *
 * @param id - Module ID in format `<api>_<module>` (e.g., 'content_projects_v2')
 * @returns Tuple of [api, moduleName] (e.g., ['content', 'projects_v2'])
 * @throws Error if module ID doesn't match expected format
 */
export function parseModuleID(id: string): [string, string] {
	const parts = id.split('_')
	if (parts.length < 2) {
		throw new Error(
			`Invalid module ID "${id}". Expected format: <api>_<module> (e.g., "content_projects_v2")`,
		)
	}
	const api = parts[0]
	const moduleName = parts.slice(1).join('_')
	return [api, moduleName]
}

/**
 * Build nested module structure from flat registry
 *
 * Transforms:
 * ```
 * { content_projects_v2: Constructor, content_users_v2: Constructor }
 * ```
 * Into:
 * ```
 * { content: { projects_v2: Constructor, users_v2: Constructor } }
 * ```
 *
 * @returns Nested structure organized by API namespace
 */
export function buildModuleStructure(): Record<string, Record<string, ModuleConstructor>> {
	const structure: Record<string, Record<string, ModuleConstructor>> = {}

	for (const [id, constructor] of Object.entries(MODULE_REGISTRY)) {
		const [api, moduleName] = parseModuleID(id)

		if (!structure[api]) {
			structure[api] = {}
		}

		structure[api][moduleName] = constructor
	}

	return structure
}

/**
 * Extract API name from module ID
 * @example ParseAPI<'content_projects_v2'> = 'content'
 */
type ParseAPI<T extends string> = T extends `${infer API}_${string}` ? API : never

/**
 * Extract module name for a given API
 * @example ParseModule<'content_projects_v2', 'content'> = 'projects_v2'
 */
type ParseModule<T extends string, API extends string> = T extends `${API}_${infer Module}`
	? Module
	: never

/**
 * Group registry modules by API namespace
 *
 * Transforms flat registry into nested structure at the type level:
 * ```
 * { content_projects_v2: ModuleClass } → { content: { projects_v2: ModuleInstance } }
 * ```
 */
type GroupByAPI<Registry extends Record<string, ModuleConstructor>> = {
	[API in ParseAPI<keyof Registry & string>]: {
		[Module in ParseModule<keyof Registry & string, API>]: InstanceType<
			Registry[`${API}_${Module}`]
		>
	}
}

/**
 * Inferred client module structure
 **/
export type InferredClientModules = GroupByAPI<typeof MODULE_REGISTRY>
