export namespace ContentApi {
	export namespace Content {
		export namespace v3 {
			export type ContentType =
				| 'mod'
				| 'plugin'
				| 'datapack'
				| 'resourcepack'
				| 'shader'
				| 'modpack'

			export type ResolutionPreferences = {
				game_versions?: string[]
				loaders?: string[]
			}

			export type VersionType = 'release' | 'beta' | 'alpha'

			export type ResolveContentRequest = {
				project_id: string
				version_id?: string | null
				content_type: ContentType
				selected?: ResolutionPreferences
				target?: ResolutionPreferences
				existing_project_ids?: string[]
				/** Least stable version type to prefer. Omitted allows every version type. */
				update_channel?: VersionType | null
			}

			export type ResolveContentPlan = {
				primary: ResolvedContent
				dependencies: ResolvedContent[]
				skipped: SkippedContent[]
			}

			export type ResolvedContent = {
				project_id: string
				version_id: string
				dependent_on_version_id?: string | null
			}

			export type SkippedContent = {
				project_id: string
				version_id?: string | null
				dependent_on_version_id?: string | null
				reason:
					| 'already_installed'
					| 'duplicate_project'
					| 'conflicting_dependency'
					| 'no_compatible_version'
					| 'missing_version'
					| 'quilt_fabric_api'
			}
		}
	}

	export namespace Attribution {
		export namespace Internal {
			export type AttributionPermissionKind =
				| 'license'
				| 'my_project'
				| 'special_permissions'
				| 'globally_allowed'
				| 'no_permission'
			export type AttributionResolutionKind = AttributionPermissionKind

			export type AttributionLicense = string | { name: string }

			export type AttributionModerationStatusKind = 'not_allowed' | 'approved' | 'bad_proof'

			export type AttributionModerationStatus = {
				kind: AttributionModerationStatusKind
				reason: string
				moderated_at?: string
				moderated_by?: string
			}

			export type AttributionResolutionBase = {
				notes: string
				image_urls: string[]
				moderation_status?: AttributionModerationStatus | null
				updated_by_moderator: boolean
			}

			export type AttributionResolution =
				| (AttributionResolutionBase & {
						kind: 'license'
						license: AttributionLicense
						link_to_work: string
				  })
				| (AttributionResolutionBase & {
						kind: 'my_project'
						license: AttributionLicense
				  })
				| (AttributionResolutionBase & {
						kind: 'special_permissions'
						link_to_work: string
				  })
				| (AttributionResolutionBase & {
						kind: 'globally_allowed'
						link_to_work: string
				  })
				| (AttributionResolutionBase & {
						kind: 'no_permission'
						link_to_work?: string
				  })

			export type FlameProject = {
				id: number
				title: string
				url: string
				icon_url: string
			}

			export type AttributionFile = {
				name: string
				sha1: string
				versions: string[]
				moderation_external_license_id?: number
				moderation_external_license?: ExternalProjects.Internal.ExternalProject
			}

			export type AttributionVersionInfo = {
				id: string
				name: string
				version_number: string
				date_created: string
			}

			export type OverrideFileOnPlatform = {
				file_path: string
				sha1: string
				version_id: string
				platform_version_id: string
				platform_project_id: string
			}

			export type AttributionGroup = {
				id: string
				flame_project: FlameProject | null
				attribution: AttributionResolution | null
				attributed_at: string | null
				attributed_by: string | null
				files: AttributionFile[]
				versions: AttributionVersionInfo[]
				override_files_on_platform: OverrideFileOnPlatform[]
			}

			export type UpdateGroupRequest = {
				attribution: AttributionResolution
			}

			export type DeleteGroupsRequest = {
				groups: string[]
			}

			export type DeleteAllGroupsRequest = {
				project_id: string
			}

			export type AssignRequest = {
				sha1: string
				target_group_id: number
				project_id: string
			}

			export type SplitRequest = {
				sha1: string
				project_id: string
			}

			export type FileScanResponse = {
				new_attribution_groups: number
				new_attribution_files: number
				scanned_file_names: string[]
			}
		}
	}
	export namespace Images {
		export namespace v3 {
			/** Extensions accepted by POST /v3/image (ContentApi image pipeline). */
			export type ImageExtension = 'bmp' | 'gif' | 'jpeg' | 'jpg' | 'png' | 'webp'

			/** `context` query values accepted by POST /v3/image. */
			export type ImageUploadContext = 'project' | 'version' | 'thread_message' | 'report'

			export type UploadedImage = {
				id: string
				url: string
				size: number
				created: string
				owner_id: string
			} & (
				| { context: 'project'; project_id: string }
				| { context: 'version'; version_id: string }
				| { context: 'thread_message'; thread_message_id: string }
				| { context: 'report'; report_id: string | null }
			)

			export type UploadedImageFor<C extends ImageUploadContext> = Extract<
				UploadedImage,
				{ context: C }
			>

			/**
			 * Target for POST /v3/image (per-context id query params, plus `context`).
			 * `ext` is passed as a separate argument on the client module.
			 */
			export type UploadImageParams =
				| { context: 'project'; project_id: string }
				| { context: 'version'; version_id: string }
				| { context: 'thread_message'; thread_message_id: string }
				| { context: 'report'; report_id?: string }
		}
	}

	export namespace Globals {
		export namespace Internal {
			export type Globals = {
				tax_compliance_thresholds: Record<string, number>
				captcha_enabled: boolean
				max_project_icon_size: number
				max_user_icon_size: number
				max_organization_icon_size: number
				max_collection_icon_size: number
				max_oauth_client_icon_size: number
				max_gallery_image_size: number
			}
		}
	}

	export namespace Projects {
		export namespace v2 {
			export type Environment = 'required' | 'optional' | 'unsupported' | 'unknown'

			export type ProjectStatus =
				| 'approved'
				| 'archived'
				| 'rejected'
				| 'draft'
				| 'unlisted'
				| 'processing'
				| 'withheld'
				| 'scheduled'
				| 'private'
				| 'unknown'

			export type MonetizationStatus = 'monetized' | 'demonetized' | 'force-demonetized'

			export type ProjectType =
				| 'mod'
				| 'modpack'
				| 'resourcepack'
				| 'shader'
				| 'plugin'
				| 'datapack'
				| 'project'

			export type GalleryImage = {
				url: string
				featured: boolean
				title?: string
				description?: string
				created: string
				ordering: number
			}

			export type DonationLink = {
				id: string
				platform: string
				url: string
			}

			export interface CreateProjectBase {
				title: string
				project_type: 'mod'
				slug: string
				description: string
				body: string
				requested_status: v2.ProjectStatus
				initial_versions: unknown[]
				team_members: unknown[]
				categories: string[]
				client_side: string
				server_side: string
				license_id: string
				is_draft: boolean
				organization_id?: string
			}

			export type Project = {
				id: string
				slug: string
				project_type: ProjectType
				actualProjectType: ProjectType
				team: string
				organization: string | null
				title: string
				description: string
				body: string
				published: string
				updated: string
				approved?: string
				queued?: string
				status: ProjectStatus
				requested_status?: ProjectStatus
				moderator_message?: {
					message: string
					body?: string
				}
				license: {
					id: string
					name: string
					url?: string
				}
				client_side: Environment
				server_side: Environment
				downloads: number
				followers: number
				categories: string[]
				additional_categories: string[]
				game_versions: string[]
				loaders: string[]
				versions: string[]
				icon_url?: string
				raw_icon_url?: string
				issues_url?: string
				source_url?: string
				wiki_url?: string
				discord_url?: string
				donation_urls?: DonationLink[]
				gallery?: GalleryImage[]
				color?: number
				thread_id: string
				monetization_status: MonetizationStatus
			}

			export type ProjectCheckResponse = {
				id: string
			}

			export type SearchResultHit = {
				project_id: string
				project_type: ProjectType
				slug: string
				author: string
				title: string
				description: string
				categories: string[]
				display_categories: string[]
				versions: string[]
				downloads: number
				follows: number
				icon_url: string
				date_created: string
				date_modified: string
				latest_version?: string
				license: string
				client_side: Environment
				server_side: Environment
				gallery: string[]
				color?: number
			}

			export type SearchResult = {
				hits: SearchResultHit[]
				offset: number
				limit: number
				total_hits: number
			}

			export type ProjectSearchParams = {
				query?: string
				facets?: string[][] // in the format of [["categories:forge"],["versions:1.17.1"]]
				new_filters?: string
				filters?: string
				index?: 'relevance' | 'downloads' | 'follows' | 'newest' | 'updated'
				offset?: number
				limit?: number
			}

			export interface DependencyInfo {
				projects: Project[]
				versions: ContentApi.Versions.v2.Version[]
			}

			export type BulkEditProjectRequest = {
				categories?: string[]
				add_categories?: string[]
				remove_categories?: string[]
				additional_categories?: string[]
				add_additional_categories?: string[]
				remove_additional_categories?: string[]
				donation_urls?: DonationLink[]
				add_donation_urls?: DonationLink[]
				remove_donation_urls?: DonationLink[]
				issues_url?: string | null
				source_url?: string | null
				wiki_url?: string | null
				discord_url?: string | null
			}
		}

		export namespace v3 {
			export type ProjectType =
				| 'mod'
				| 'modpack'
				| 'resourcepack'
				| 'shader'
				| 'plugin'
				| 'datapack'

			export type Environment =
				| 'client_and_server'
				| 'client_only'
				| 'client_only_server_optional'
				| 'singleplayer_only'
				| 'server_only'
				| 'server_only_client_optional'
				| 'dedicated_server_only'
				| 'client_or_server'
				| 'client_or_server_prefers_both'
				| 'unknown'

			export type GalleryItem = {
				id?: number
				url: string
				raw_url: string
				featured: boolean
				name?: string
				description?: string
				created: string
				ordering: number
			}

			export type Link = {
				platform: string
				donation: boolean
				url: string
			}

			export type NormalizedProjectNagKind =
				| 'minecraft-title-clause'
				| 'project-name-non-standard-text'
				| 'project-name-profanity'
				| 'project-name-slur'
				| 'project-name-version'
				| 'project-summary-links'
				| 'project-summary-matches-title'
				| 'project-summary-non-english'
				| 'project-summary-non-standard-text'
				| 'project-summary-profanity'
				| 'project-summary-slur'
				| 'project-summary-spam'
				| 'summary-special-formatting'
				| 'summary-too-short'
				| 'add-icon'
				| 'feature-gallery-image'
				| 'upload-gallery-image'
				| 'gallery-text-non-standard'
				| 'gallery-text-profanity'
				| 'gallery-text-slur'
				| 'add-description'
				| 'adjacent-headers'
				| 'description-ends-with-header'
				| 'description-too-short'
				| 'long-headers'
				| 'missing-alt-text'
				| 'project-description-matches-summary'
				| 'project-description-non-english'
				| 'project-description-non-standard-text'
				| 'project-description-profanity'
				| 'project-description-slur'
				| 'project-description-spam'
				| 'add-custom-license-details'
				| 'select-license'
				| 'add-links'
				| 'add-links-server'
				| 'link-validation'
				| 'gpl-license-source-required'
				| 'review-permissions'
				| 'add-java-address'
				| 'all-languages'
				| 'select-compatibility'
				| 'modpack-version-not-public'
				| 'select-country'
				| 'select-language'
				| 'too-many-languages'
				| 'all-tags-selected'
				| 'multiple-resolution-tags'
				| 'select-tags'
				| 'too-many-tags'
				| 'too-many-tags-server'
				| 'select-environment'
				| 'upload-version'
				| 'check-disclosures'
				| 'disclosures-special-formatting'
				| 'moderator-feedback'

			type ReplaceHyphensWithUnderscores<T extends string> = T extends `${infer Head}-${infer Tail}`
				? `${Head}_${ReplaceHyphensWithUnderscores<Tail>}`
				: T

			export type ProjectNagKind = ReplaceHyphensWithUnderscores<NormalizedProjectNagKind>

			export type ProjectNagSeverity = 'required' | 'warning' | 'suggestion'

			export type ProjectNag = {
				kind: ProjectNagKind
				severity: ProjectNagSeverity
				details: Record<string, unknown>
			}

			export type ProjectValidationResponse = {
				nags: ProjectNag[]
			}

			export type Project = {
				id: string
				slug?: string
				project_types: ProjectType[]
				games: string[]
				team_id: string
				organization?: string
				name: string
				summary: string
				description: string
				published: string
				updated: string
				approved?: string
				queued?: string
				status: v2.ProjectStatus
				requested_status?: v2.ProjectStatus
				license: {
					id: string
					name: string
					url?: string
				}
				downloads: number
				followers: number
				categories: string[]
				additional_categories: string[]
				loaders: string[]
				mrpack_loaders: string[]
				versions: string[]
				icon_url?: string
				raw_icon_url?: string
				link_urls: Record<string, Link>
				gallery: GalleryItem[]
				color?: number
				thread_id: string
				monetization_status: v2.MonetizationStatus
				side_types_migration_review_status: 'reviewed' | 'pending'
				environment?: Environment[]

				minecraft_server?: MinecraftServer | null
				minecraft_java_server?: MinecraftJavaServer | null
				minecraft_bedrock_server?: MinecraftBedrockServer | null
				minecraft_mod?: unknown | null

				/**
				 * @deprecated Not recommended to use.
				 **/
				[key: string]: unknown
			}

			interface CreateProjectBase {
				name: string // 3-64 chars
				slug: string // 3-64 chars, URL-safe
				summary: string // 3-255 chars
				description: string // max 65536 chars, markdown
				requested_status: v2.ProjectStatus
				organization_id?: string // automatically transfer the project to this organization
			}

			export interface MinecraftJavaServerPing {
				address: string
				data?: {
					description: string
					latency: {
						nanos: number
						secs: number
					}
					players_max: number
					players_online: number
					version_name: string
					version_protocol: number
				}
				port: number
				when: string
			}

			export interface MinecraftServer {
				max_players?: number
				region?: string
				active_version?: string | null
				languages?: string[]
				/**
				 * deprecated, use region instead
				 */
				country?: string
			}

			export interface ModpackContent {
				kind: 'modpack'
				version_id: string
				project_id?: string
				project_name?: string
				project_icon?: string
			}
			export interface VanillaContent {
				kind: 'vanilla'
				supported_game_versions: string[]
				recommended_game_version?: string
			}

			export interface MinecraftJavaServer {
				address?: string
				content?: ModpackContent | VanillaContent
				verified_plays_4w?: number | null
				verified_plays_2w?: number | null
				ping: Projects.v3.MinecraftJavaServerPing | null
			}

			export interface MinecraftBedrockServer {
				address?: string
			}

			export interface CreateServerProjectRequest {
				base: CreateProjectBase
				minecraft_server?: MinecraftServer
				minecraft_java_server?: Omit<MinecraftJavaServer, 'ping'>
				minecraft_bedrock_server?: MinecraftBedrockServer
			}

			export type EditProjectRequest = {
				name?: string
				summary?: string
				description?: string
				categories?: string[]
				additional_categories?: string[]
				license_url?: string | null
				link_urls?: Record<string, string | null>
				license_id?: string
				slug?: string
				status?: v2.ProjectStatus
				requested_status?: v2.ProjectStatus | null
				moderation_message?: string | null
				moderation_message_body?: string | null
				monetization_status?: v2.MonetizationStatus
				side_types_migration_review_status?: 'reviewed' | 'pending'
				environment?: Environment

				minecraft_server?: MinecraftServer
				minecraft_java_server?: Omit<MinecraftJavaServer, 'ping'>
				minecraft_bedrock_server?: MinecraftBedrockServer
				[key: string]: unknown
			}

			export type Organization = {
				id: string
				slug: string
				name: string
				team_id: string
				description: string
				icon_url: string | null
				raw_icon_url: string | null
				color: number | null
				members: TeamMember[]
			}

			export type OrganizationMember = {
				team_id: string
				user: Users.v3.User
				role: string
				is_owner: boolean
				permissions: number
				organization_permissions: number
				accepted: boolean
				payouts_split: number
				ordering: number
			}

			export type TeamMember = {
				team_id: string
				user: Users.v3.User
				role: string
				is_owner: boolean
				permissions: number | null
				organization_permissions: number | null
				accepted: boolean
				payouts_split: number | null
				ordering: number
			}

			export type Team = {
				id: string
				members: TeamMember[]
			}

			export type ProjectDependencies = {
				projects: Project[]
				versions: ContentApi.Versions.v3.Version[]
			}

			export type TelemetryConsent = 'opt_in' | 'opt_out' | 'always_active'

			export type AiUsage = 'code' | 'assets' | 'text'

			export type DisclosureLockStatus = 'unlocked' | 'cannot_disable' | 'fully_locked'

			export type DerivativeSource = {
				label: string
				link?: string | null
				note?: string | null
			}

			export type ProjectDisclosure =
				| {
						type: 'ai_content'
						uses: AiUsage[]
						note?: string | null
				  }
				| {
						type: 'ai_functionality'
						note?: string | null
				  }
				| {
						type: 'advertisements'
						note?: string | null
				  }
				| {
						type: 'epilepsy_triggers'
						note?: string | null
				  }
				| {
						type: 'system_interactions'
						interactions: string[]
						note?: string | null
				  }
				| {
						type: 'telemetry'
						consent: TelemetryConsent
						data_collected: string[]
				  }
				| {
						type: 'derivative_work'
						sources: DerivativeSource[]
				  }
				| {
						type: 'paid_features'
						features: string[]
				  }
				| {
						type: 'archived'
						note?: string | null
				  }

			export type ProjectDisclosureData = ProjectDisclosure & {
				set_by_moderator?: boolean | null
				lock_status?: DisclosureLockStatus | null
				updated_at: string
				updated_by?: string | null
				deleted_at?: string | null
			}

			export type ProjectDisclosureType = ProjectDisclosure['type']

			export type ProjectDisclosureOf<T extends ProjectDisclosureType> = Extract<
				ProjectDisclosureData,
				{ type: T }
			>

			export type GetProjectDisclosures = {
				disclosures: ProjectDisclosureData[]
			}

			export type ModifyProjectDisclosures = {
				set: ProjectDisclosure[]
				remove: ProjectDisclosureType[]
				lock_status?: DisclosureLockStatus | null
			}
		}
	}

	export namespace Organizations {
		export namespace v3 {
			export type Organization = {
				id: string
				slug: string
				name: string
				team_id: string
				description: string
				icon_url: string | null
				raw_icon_url: string | null
				color: number | null
				members: Projects.v3.TeamMember[]
				moderation_notes?: Users.Common.ModerationNote | null
			}

			export type CreateOrganizationRequest = {
				slug: string
				name: string
				description: string
			}

			export type EditOrganizationRequest = {
				description?: string
				slug?: string
				name?: string
			}

			export type AddProjectRequest = {
				project_id: string
			}

			export type RemoveProjectRequest = {
				new_owner: string
			}
		}
	}

	export namespace Versions {
		export namespace v2 {
			export type VersionType = 'release' | 'beta' | 'alpha'

			export type VersionStatus =
				| 'listed'
				| 'archived'
				| 'draft'
				| 'unlisted'
				| 'scheduled'
				| 'unknown'

			export type DependencyType = 'required' | 'optional' | 'incompatible' | 'embedded'

			export type FileType = 'required-resource-pack' | 'optional-resource-pack' | 'unknown'

			export type VersionFileHash = {
				sha512: string
				sha1: string
			}

			export type VersionFile = {
				id?: string
				hashes: VersionFileHash
				url: string
				filename: string
				primary: boolean
				size: number
				file_type?: FileType
			}

			export type Dependency = {
				file_name?: string
				dependency_type: DependencyType
			} & (
				| {
						project_id: string
				  }
				| {
						version_id: string
						project_id?: string
				  }
			)

			export type Version = {
				id: string
				project_id: string
				author_id: string
				featured: boolean
				name: string
				version_number: string
				changelog: string
				changelog_url?: string | null
				date_published: string
				downloads: number
				version_type: VersionType
				status: VersionStatus
				requested_status?: VersionStatus | null
				files: VersionFile[]
				dependencies: Dependency[]
				game_versions: string[]
				loaders: string[]
			}

			export interface GetProjectVersionsParams {
				game_versions?: string[]
				loaders?: string[]
				include_changelog?: boolean
				limit?: number
				offset?: number
			}
		}

		// TODO: consolidate duplicated types between v2 and v3 versions
		export namespace v3 {
			export type FlameProject = {
				id: number
				title: string
				url: string
				icon_url: string
			}

			export type DependencyAttribution = {
				flame_project?: FlameProject
				resolution?: DependencyAttributionResolution
			}

			export type DependencyAttributionResolution =
				| {
						kind: 'license'
						license: ContentApi.Attribution.Internal.AttributionLicense
						link_to_work: string
				  }
				| {
						kind: 'globally_allowed'
						link_to_work: string
				  }
				| {
						kind: 'my_project'
						license: ContentApi.Attribution.Internal.AttributionLicense
				  }
				| {
						kind: 'special_permissions'
						link_to_work: string
				  }
				| {
						kind: 'no_permission'
						link_to_work?: string
				  }

			export interface Dependency {
				dependency_type: ContentApi.Versions.v2.DependencyType
				project_id?: string
				file_name?: string
				version_id?: string
				attribution?: DependencyAttribution
			}

			export interface GetProjectVersionsParams {
				game_versions?: string[]
				loaders?: string[]
				include_changelog?: boolean
				limit?: number
				offset?: number
				apiVersion?: 2 | 3
			}

			export type VersionChannel = 'release' | 'beta' | 'alpha'

			export type FileType =
				| 'required-resource-pack'
				| 'optional-resource-pack'
				| 'sources-jar'
				| 'dev-jar'
				| 'javadoc-jar'
				| 'signature'
				| 'unknown'

			export type FileHashType = 'sha512' | 'sha1'
			export type VersionFileHash = {
				[key in FileHashType]: string
			}

			export interface VersionFile {
				id?: string
				hashes: VersionFileHash
				url: string
				filename: string
				primary: boolean
				size: number
				file_type?: FileType
			}

			interface JavaServerVersion {
				/**
				 * The version id of the modpack
				 */
				modpack: string
			}

			export interface Version {
				name: string
				version_number: string
				changelog?: string
				dependencies: Dependency[]
				game_versions: string[]
				version_type: VersionChannel
				loaders: string[]
				featured: boolean
				status: ContentApi.Versions.v2.VersionStatus
				id: string
				project_id: string
				author_id: string
				date_published: string
				downloads: number
				files: VersionFile[]
				files_missing_attribution?: string[]
				environment?: ContentApi.Projects.v3.Environment
				mrpack_loaders?: string[]

				minecraft_java_server?: JavaServerVersion
			}

			export interface DraftVersionFile {
				fileType?: FileType
				file: File
			}

			export type DraftVersion = Omit<
				ContentApi.Versions.v3.CreateVersionRequest,
				'file_parts' | 'primary_file' | 'file_types'
			> & {
				existing_files?: VersionFile[]
				version_id?: string
				environment?: ContentApi.Projects.v3.Environment
			}

			export interface CreateVersionRequest {
				name: string
				version_number: string
				changelog: string
				dependencies?: Array<{
					version_id?: string
					project_id?: string
					file_name?: string
					dependency_type: ContentApi.Versions.v2.DependencyType
				}>
				game_versions: string[]
				version_type: 'release' | 'beta' | 'alpha'
				loaders: string[]
				featured?: boolean
				status?: 'listed' | 'archived' | 'draft' | 'unlisted' | 'scheduled' | 'unknown'
				requested_status?: 'listed' | 'archived' | 'draft' | 'unlisted' | null
				project_id: string
				file_parts: string[]
				primary_file?: string
				file_types?: Record<string, ContentApi.Versions.v3.FileType | null>
				environment?: ContentApi.Projects.v3.Environment
				mrpack_loaders?: string[]
			}

			export type ModifyVersionRequest = Partial<
				Omit<CreateVersionRequest, 'project_id' | 'file_parts' | 'primary_file' | 'file_types'>
			> & {
				file_types?: {
					algorithm: string
					hash: string
					file_type: ContentApi.Versions.v3.FileType | null
				}[]
			}

			export type AddFilesToVersionRequest = {
				file_parts: string[]
				file_types?: Record<string, ContentApi.Versions.v3.FileType | null>
			}
		}
	}

	export namespace Users {
		export namespace Common {
			export type Role = 'developer' | 'moderator' | 'admin'

			export type AuthProvider =
				| 'github'
				| 'discord'
				| 'microsoft'
				| 'gitlab'
				| 'google'
				| 'steam'
				| 'paypal'

			export type UserPayoutData = {
				paypal_address?: string
				paypal_country?: string
				venmo_handle?: string
				balance: number
			}

			export type ModerationNote = {
				notes: string
				last_modified: string
				created_at: string
				last_author: string
				user_rating: number
				version: number
			}

			export type UserLock = {
				locked_by: string
				reason: string
				created: string
			}

			export type UserRestriction = {
				removed_perms: number
				reason: string | null
				private_reason?: string
				restricted_by?: string
				updated: string
			}
		}

		export namespace v2 {
			export type Role = Common.Role
			export type AuthProvider = Common.AuthProvider
			export type UserPayoutData = Common.UserPayoutData

			export type User = {
				id: string
				username: string
				name?: string
				avatar_url?: string
				bio?: string
				created: string
				role: Role
				badges: number
				auth_providers?: AuthProvider[]
				email?: string
				email_verified?: boolean
				has_password?: boolean
				has_totp?: boolean
				payout_data?: UserPayoutData
				github_id?: number
			}
		}

		export namespace v3 {
			export type Role = Common.Role
			export type AuthProvider = Common.AuthProvider
			export type UserPayoutData = Common.UserPayoutData
			export type Theme = 'light' | 'dark' | 'oled' | 'retro'
			export type LayoutOption = 'grid' | 'rows'
			export type FriendPrivacy = 'none' | 'mutual' | 'everyone'
			export type InvitePrivacy = 'none' | 'friends' | 'everyone'

			export type AppearancePreferences = {
				auto: boolean
				theme: Theme
			}

			export type BehaviorPreferences = {
				minimize_app: boolean
				refocus_on_game_close: boolean
				hide_right_sidebar: boolean
				show_jump_in: boolean
				compact_instance_cards: boolean
				show_play_time: boolean
				hide_nametag: boolean
				show_all_screenshots: boolean
				show_files_tab_in_instances: boolean
				show_worlds_tab_in_instances: boolean
				show_screenshots_tab_in_instances: boolean
				show_skin_selector_in_sidebar: boolean
				quick_instance_count: number
				warn_on_unknown_modpacks: boolean
				skip_non_essential_warnings: boolean
			}

			export type LocalizationPreferences = {
				locale: string
			}

			export type LayoutPreferences = {
				mods: LayoutOption
				plugins: LayoutOption
				datapacks: LayoutOption
				shaders: LayoutOption
				resourcepacks: LayoutOption
				modpacks: LayoutOption
				servers: LayoutOption
				users: LayoutOption
			}

			export type SidebarPreferences = {
				right_aligned_search: boolean
				left_aligned_content: boolean
			}

			export type SocialPreferences = {
				friend_privacy: FriendPrivacy
				shared_instances_privacy: InvitePrivacy
				hosting_access_privacy: InvitePrivacy
			}

			export type UserPreferences = {
				appearance: AppearancePreferences
				behavior: BehaviorPreferences
				localization: LocalizationPreferences
				layouts: LayoutPreferences
				sidebars: SidebarPreferences
				social: SocialPreferences
			}

			export type PartialUserPreferences = {
				appearance?: Partial<AppearancePreferences>
				behavior?: Partial<BehaviorPreferences>
				localization?: Partial<LocalizationPreferences>
				layouts?: Partial<LayoutPreferences>
				sidebars?: Partial<SidebarPreferences>
				social?: Partial<SocialPreferences>
			}

			export type Pride26CampaignDonation = {
				last_donated_at: string
				has_badge: boolean
				has_midas: boolean
			}

			export type UserCampaigns = {
				pride_26: Pride26CampaignDonation | null
			}

			export type User = {
				id: string
				username: string
				avatar_url?: string
				raw_avatar_url?: string
				bio?: string
				created: string
				role: Role
				badges: number
				campaigns: UserCampaigns
				auth_providers?: AuthProvider[]
				email?: string
				email_verified?: boolean
				has_password?: boolean
				has_totp?: boolean
				payout_data?: UserPayoutData
				stripe_customer_id?: string
				allow_friend_requests?: boolean
				moderation_notes?: Common.ModerationNote | null
				lock?: Common.UserLock
				restriction?: Common.UserRestriction
				github_id?: number
				discord_id?: string
				steam_id?: string
			}

			export type SearchUser = {
				id: string
				username: string
				avatar_url: string | null
			}

			export type AllProjectsResponse = {
				projects: Projects.v3.Project[]
				organizations: Record<string, Organizations.v3.Organization>
			}
		}
	}

	export namespace Tags {
		export namespace v2 {
			export interface Category {
				icon: string
				name: string
				project_type: string
				header: string
			}

			export interface Loader {
				icon: string
				name: string
				supported_project_types: string[]
			}

			export interface GameVersion {
				version: string
				version_type: string
				date: string
				major: boolean
			}

			export interface DonationPlatform {
				short: string
				name: string
			}

			export interface License {
				short: string
				name: string
			}

			export type LicenseText = {
				title: string
				body: string
			}
		}
	}

	export namespace Teams {
		export namespace v2 {
			export type AddTeamMemberRequest = {
				user_id: string
				role?: string
				permissions?: number
				organization_permissions?: number | null
				payouts_split?: number
				ordering?: number
			}

			export type EditTeamMemberRequest = {
				permissions?: number
				organization_permissions?: number | null
				role?: string
				payouts_split?: number
				ordering?: number
			}

			export type TransferOwnershipRequest = {
				user_id: string
			}
		}
	}

	export namespace Search {
		export type SearchParams = {
			query?: string
			offset?: string | number
			index?: string
			limit?: string | number
			new_filters?: string
			facets?: string[][]
			filters?: string
			version?: string
		}

		export namespace v2 {
			export interface ResultSearchProject {
				project_id: string
				project_type: string
				all_project_types: string[]
				slug: string | null
				author: string
				author_id: string | null
				organization: string | null
				organization_id: string | null
				title: string
				description: string
				categories: string[]
				display_categories: string[]
				versions: string[]
				downloads: number
				follows: number
				icon_url: string
				date_created: string
				date_modified: string
				latest_version: string
				license: string
				client_side: string
				server_side: string
				disclosure_types: string[]
				gallery: string[]
				featured_gallery: string | null
				color: number | null
			}

			export interface SearchResults {
				hits: ResultSearchProject[]
				offset: number
				limit: number
				total_hits: number
			}
		}

		export namespace v3 {
			export interface ResultSearchProject {
				version_id?: string
				project_id: string
				project_types: string[]
				all_project_types: string[]
				slug: string | null
				author: string
				author_id: string | null
				organization: string | null
				organization_id: string | null
				name: string
				summary: string
				categories: string[]
				display_categories: string[]
				downloads: number
				follows: number
				icon_url: string | null
				date_created: string
				date_modified: string
				license: string
				gallery: string[]
				featured_gallery: string | null
				color: number | null
				loaders: string[]
				project_loader_fields?: Record<string, unknown[]> & {
					environment?: Projects.v3.Environment[]
				}
				minecraft_server?: Projects.v3.MinecraftServer | null
				minecraft_java_server?: Projects.v3.MinecraftJavaServer | null
				minecraft_bedrock_server?: Projects.v3.MinecraftBedrockServer | null
				minecraft_mod?: unknown | null
				disclosure_types: string[]
			}

			export interface SearchResults {
				hits: ResultSearchProject[]
				page: number
				hits_per_page: number
				total_hits: number
			}
		}
	}

	export namespace Threads {
		export namespace v3 {
			export type ThreadType = 'report' | 'project' | 'direct_message'

			export type TextTarget = {
				original: string
				suggestion?: string | null
			}

			export type OptionalTextTarget = {
				original?: string | null
				/** Omitted means no suggestion; null suggests removing the value. */
				suggestion?: string | null
			}

			export type DisclosureMetadata<T extends Projects.v3.ProjectDisclosureType> = Omit<
				Extract<Projects.v3.ProjectDisclosure, { type: T }>,
				'type'
			>

			export type DisclosureMetadataTarget<T extends Projects.v3.ProjectDisclosureType> = {
				original: DisclosureMetadata<T> | null
				suggestion?: DisclosureMetadata<T> | null
			}

			export type ModifyDisclosureTarget = {
				[T in Projects.v3.ProjectDisclosureType]: {
					type: 'modify_project_disclosure'
					value: {
						disclosure_type: T
						metadata: DisclosureMetadataTarget<T>
					}
				}
			}[Projects.v3.ProjectDisclosureType]

			export type VersionIssueTarget =
				| { type: 'remove' }
				| { type: 'modify_environment'; value: TextTarget }
				| {
						type: 'modify_game_versions'
						value: { original: string[]; suggestion?: string[] | null }
				  }
				| {
						type: 'modify_dependencies'
						value: {
							original: Versions.v3.Dependency[]
							suggestion?: Versions.v3.Dependency[] | null
						}
				  }
				| { type: 'modify_changelog'; value: TextTarget }
				| { type: 'remove_additional_files'; value: { file_ids: string[] } }
				| {
						type: 'modify_additional_file_type'
						value: {
							file_id: string
							filename: string
							original?: Versions.v3.FileType | null
							suggestion?: Versions.v3.FileType | null
						}
				  }

			export type ThreadIssueTarget =
				| { type: 'mark_addressed' }
				| { type: 'modify_title'; value: TextTarget }
				| { type: 'modify_slug'; value: TextTarget }
				| { type: 'modify_summary'; value: TextTarget }
				| { type: 'modify_description'; value: TextTarget }
				| { type: 'modify_license'; value: { license: TextTarget; url: TextTarget } }
				| { type: 'modify_icon'; value: { original_url: string | null } }
				| { type: 'remove_icon' }
				| { type: 'remove_tags'; value: { tags: string[] } }
				| { type: 'modify_links'; value: { links: Record<string, TextTarget> } }
				| {
						type: 'add_gallery_images'
						value: { original_image_ids: number[]; auto_resolve: boolean }
				  }
				| {
						type: 'modify_gallery_image'
						value: {
							image_id: number
							original_url: string
							name?: OptionalTextTarget | null
							description?: OptionalTextTarget | null
						}
				  }
				| {
						type: 'remove_gallery_images'
						value: {
							image_ids: number[]
							original_images?: { id: number; url: string; name?: string }[]
						}
				  }
				| { type: 'add_project_disclosures'; value: { disclosure_types: string[] } }
				| { type: 'remove_project_disclosures'; value: { disclosure_types: string[] } }
				| ModifyDisclosureTarget
				| {
						type: 'modify_project_disclosure_note'
						value: { disclosure_type: string; note: OptionalTextTarget }
				  }
				| {
						type: 'version'
						value: {
							version_id: string
							version_number: string
							target: VersionIssueTarget
						}
				  }
				| {
						type: 'modify_team_member_role'
						value: { team_id: string; user_id: string; role: TextTarget }
				  }
				| {
						type: 'modify_server_languages'
						value: { original: string[]; suggestion?: string[] | null }
				  }
				| {
						type: 'modify_server_address'
						value: {
							platform: 'minecraft_java' | 'minecraft_bedrock'
							address: TextTarget
						}
				  }
				| { type: 'acknowledge'; value: { mode: 'checkbox' | 'reply' } }

			export type NewThreadIssueFacet = { what: ThreadIssueTarget }

			export type ThreadIssueLocation = {
				field:
					| 'title'
					| 'slug'
					| 'summary'
					| 'icon'
					| 'description'
					| 'license'
					| 'tags'
					| 'links'
					| 'gallery'
					| 'disclosures'
					| 'versions'
					| 'members'
					| 'server'
					| 'permissions'
				label?: { id: string; defaultMessage?: string }
			}

			/**
			 * The backend stores `why` as an arbitrary JSON blob; this schema is interpreted by the frontend.
			 * Fields are optional to support issues created before review metadata was added.
			 */
			export type ThreadIssueWhy = {
				issue_id?: string
				/**
				 * this is to indicate where to show issue card if the issue facet(action) does not have a specific location.
				 */
				locations?: ThreadIssueLocation[]
				title?: string
				message?: string
				custom?: { priority: string }
				/**
				 * this is the state of the issue, at creation time.used for re - rev
				 */
				selection?: {
					toggle_ids: string[]
					text_values: Record<string, string>
					select_values: Record<string, string[]>
				}
			}

			export type NewThreadIssue = {
				why: ThreadIssueWhy
				facets: [NewThreadIssueFacet, ...NewThreadIssueFacet[]]
			}

			export type NewThreadIssues = {
				issues: [NewThreadIssue, ...NewThreadIssue[]]
			}

			export type ThreadIssueVerdict = 'open' | 'addressed' | 'resolved'

			export type ThreadIssueFacet = {
				id: string
				what: ThreadIssueTarget
				user_addressed: boolean
				moderator_verified: boolean
				verdict: ThreadIssueVerdict
			}

			export type ThreadIssue = {
				id: string
				created_by: string | null
				created_at: string
				why: ThreadIssueWhy
				facets: ThreadIssueFacet[]
				verdict: ThreadIssueVerdict
			}

			export type EditThreadIssueFacet = {
				user_addressed?: boolean
				moderator_verified?: boolean
			}

			export type MessageBody =
				| {
						type: 'text'
						body: string
						private?: boolean
						replying_to?: string
						associated_images?: string[]
				  }
				| {
						type: 'status_change'
						new_status: Projects.v2.ProjectStatus
						old_status: Projects.v2.ProjectStatus
				  }
				| {
						type: 'auto_approval'
						new_status: Projects.v2.ProjectStatus
						old_status: Projects.v2.ProjectStatus
				  }
				| {
						type: 'tech_review'
						verdict: 'safe' | 'unsafe'
				  }
				| {
						type: 'tech_review_entered'
				  }
				| {
						type: 'tech_review_exited'
				  }
				| {
						type: 'tech_review_exit_file_deleted'
				  }
				| {
						type: 'thread_closure'
				  }
				| {
						type: 'thread_reopen'
				  }
				| {
						type: 'deleted'
						private?: boolean
				  }

			export type ThreadMessage = {
				id: string | null
				author_id: string | null
				body: MessageBody
				created: string
				hide_identity: boolean
			}

			export type ThreadMember = {
				id: string
				username: string
				avatar_url: string
				role: string
				badges: number
				created: string
				bio?: string
			}

			export type Thread = {
				id: string
				type: ThreadType
				project_id: string | null
				report_id: string | null
				messages: ThreadMessage[]
				issues: ThreadIssue[]
				members: ThreadMember[]
			}

			export type SendMessageRequest = {
				body: MessageBody
			}
		}
	}

	export namespace Notifications {
		export namespace v2 {
			export type NotificationAction = {
				title: string
				action_route: [string, string]
			}

			export type NotificationBody = {
				type: string
				project_id?: string
				version_id?: string
				report_id?: string
				thread_id?: string
				message_id?: string
				invited_by?: string
				organization_id?: string
				server_id?: string
				server_name?: string
				team_id?: string
				role?: string
				old_status?: string
				new_status?: string
				[key: string]: unknown
			}

			export type Notification = {
				id: string
				user_id: string
				type: string | null
				title: string
				text: string
				link: string
				read: boolean
				created: string
				actions: NotificationAction[]
				body: NotificationBody
			}
		}
	}

	export namespace Collections {
		export type CollectionStatus = 'listed' | 'unlisted' | 'private' | 'rejected' | 'unknown'

		export type Collection = {
			id: string
			user: string
			name: string
			description: string | null
			icon_url: string | null
			raw_icon_url: string | null
			color: number | null
			status: CollectionStatus
			created: string
			updated: string
			projects: string[]
		}

		export type EditCollectionRequest = {
			name?: string
			description?: string | null
			status?: CollectionStatus
			new_projects?: string[]
		}
	}
	export namespace ExternalProjects {
		export namespace Internal {
			export type ExternalLicenseStatus =
				| 'yes'
				| 'with-attribution-and-source'
				| 'with-attribution'
				| 'no'
				| 'permanent-no'
				| 'unidentified'

			export type LinkedFile = {
				name: string | null
				sha1: string
			}

			export type ExternalProject = {
				id: number
				title: string | null
				status: ExternalLicenseStatus
				link: string | null
				exceptions: string | null
				proof: string | null
				flame_project_id: number | null
				inserted_at: string | null
				inserted_by: number | null
				updated_at: string | null
				updated_by: number | null
				linked_files?: LinkedFile[]
			}

			export type SearchRequest = {
				title?: string
				flame_id?: number
			}

			export type UpdateLicenseRequest = {
				title?: string
				status: ExternalLicenseStatus
				link?: string
				exceptions?: string
				proof?: string
				flame_project_id?: number
			}

			export type AddFileRequest = {
				hashes: string[]
				license_id: number
			}
		}
	}
}
