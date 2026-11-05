<script setup lang="ts">
import type { ContentApi } from '@crafton/api-client'
import { CheckIcon, CompassIcon, PlusIcon, SpinnerIcon } from '@crafton/assets'
import type { BrowseInstallContentType, CardAction, ProjectType, Tags } from '@crafton/ui'
import {
	BrowsePageLayout,
	BrowseSidebar,
	commonMessages,
	defineMessages,
	formatProjectTypeSentence,
	getLatestMatchingInstallVersion,
	getProjectVersionFilterQuery,
	getSelectedInstallPreferences,
	getTargetInstallPreferences,
	injectNotificationManager,
	preferencesDiffer,
	provideBrowseManager,
	resolveInstallPlan,
	useBrowseSearch,
	useDebugLogger,
	useVIntl,
} from '@crafton/ui'
import { useQuery, useQueryClient } from '@tanstack/vue-query'
import type { Ref } from 'vue'
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import type { LocationQuery } from 'vue-router'
import { useRoute, useRouter } from 'vue-router'

import { useAppEvent } from '@/composables/use-app-event'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { get_project, get_search_results_v3, get_version_many } from '@/helpers/cache.js'
import {
	get_installed_project_ids as getInstalledProjectIds,
	getInstanceIconUrl,
	list as listInstances,
} from '@/helpers/instance'
import { get as getSettings, set as setSettings } from '@/helpers/settings.ts'
import { get_categories, get_game_versions, get_loaders } from '@/helpers/tags'
import { instanceDetailQueryOptions, instanceKeys } from '@/pages/instance/query-options'
import { injectContentInstall } from '@/providers/content-install'
import { type BreadcrumbDefinition, injectBreadcrumbManager } from '@/shared/breadcrumbs'

const { handleError } = injectNotificationManager()
const { formatMessage } = useVIntl()
const { install: installVersion } = injectContentInstall()
const queryClient = useQueryClient()
const debugLog = useDebugLogger('Browse')

const router = useRouter()
const route = useRoute()
const displayedBrowseRoute = shallowRef(router.currentRoute.value)
watch(
	() => router.currentRoute.value,
	(nextRoute) => {
		if (nextRoute.path.startsWith('/browse/')) {
			displayedBrowseRoute.value = nextRoute
		}
	},
	{ immediate: true },
)
const breadcrumbMessages = defineMessages({
	discoverProjectType: {
		id: 'app.browse.discover-project-type',
		defaultMessage: 'Discover {projectType}',
	},
})
const breadcrumbLabel = computed(() => {
	const browseRoute = displayedBrowseRoute.value
	return formatMessage(breadcrumbMessages.discoverProjectType, {
		projectType: formatProjectTypeSentence(
			formatMessage,
			String(browseRoute.params.projectType ?? ''),
			2,
		),
	})
})
const appSettings = useAppSettings()
const browseRouteActive = computed(() => route.path.startsWith('/browse/'))

const initialInstanceId = computed(() => String(route.query.i ?? ''))
const instanceQuery = useQuery(
	computed(() => ({
		...instanceDetailQueryOptions(initialInstanceId.value),
		enabled: !!initialInstanceId.value,
	})),
)
const instance = computed(() => instanceQuery.data.value ?? null)
const installedProjectIds: Ref<string[] | null> = ref(null)
const instanceHideInstalled = ref(route.query.ai === 'true')
const newlyInstalled = ref<string[]>([])
const hiddenInstanceProjectIds = ref<Set<string>>(new Set())
const hiddenInstanceProjectIdsInitialized = ref(false)

const breadcrumbManager = injectBreadcrumbManager()
const instanceBreadcrumbDefinition = {
	slot: 'instance',
	id: () => `instance:${String(displayedBrowseRoute.value.query.i ?? '')}`,
	label: () => instance.value?.name ?? formatMessage(commonMessages.loadingLabel),
	visual: () => ({
		type: 'image' as const,
		src: getInstanceIconUrl(instance.value?.icon_path),
		alt: instance.value?.name,
		tintBy: String(displayedBrowseRoute.value.query.i ?? ''),
	}),
	to: () => `/instance/${encodeURIComponent(String(displayedBrowseRoute.value.query.i ?? ''))}`,
} satisfies BreadcrumbDefinition
const breadcrumbDefinition = {
	slot: 'browse',
	id: () =>
		`browse:${String(displayedBrowseRoute.value.params.projectType ?? '')}:${String(
			displayedBrowseRoute.value.query.i ?? '',
		)}`,
	label: breadcrumbLabel,
	to: () => displayedBrowseRoute.value.fullPath,
	visual: { type: 'icon', component: CompassIcon },
} satisfies BreadcrumbDefinition

function syncBreadcrumbs() {
	if (displayedBrowseRoute.value.query.i) {
		const instanceBreadcrumb = breadcrumbManager.reset(instanceBreadcrumbDefinition)
		breadcrumbManager.push(breadcrumbDefinition, { parent: instanceBreadcrumb })
		return
	}

	breadcrumbManager.reset(breadcrumbDefinition)
}

watch(displayedBrowseRoute, syncBreadcrumbs, { immediate: true, flush: 'sync' })

debugLog('fetching tags (categories, loaders, gameVersions)')
const [categories, loaders, availableGameVersions] = await Promise.all([
	get_categories()
		.catch(handleError)
		.then(ref<ContentApi.Tags.v2.Category[]>),
	get_loaders()
		.catch(handleError)
		.then(ref<ContentApi.Tags.v2.Loader[]>),
	get_game_versions()
		.catch(handleError)
		.then(ref<ContentApi.Tags.v2.GameVersion[]>),
])

const tags: Ref<Tags> = computed(() => ({
	gameVersions: availableGameVersions.value ?? [],
	loaders: loaders.value ?? [],
	categories: categories.value ?? [],
}))

const allInstalledIds = computed(
	() => new Set([...newlyInstalled.value, ...(installedProjectIds.value ?? [])]),
)

function syncHiddenInstanceProjectIds() {
	hiddenInstanceProjectIds.value = new Set([
		...(installedProjectIds.value ?? []),
		...newlyInstalled.value,
	])
	hiddenInstanceProjectIdsInitialized.value = true
}

watch(
	installedProjectIds,
	(ids) => {
		if (!ids) return
		if (!hiddenInstanceProjectIdsInitialized.value) {
			syncHiddenInstanceProjectIds()
		}
	},
	{ immediate: true },
)

await initInstanceContext()

async function refreshInstalledProjectIds() {
	if (!route.query.i) {
		const instances = await queryClient
			.fetchQuery({
				networkMode: 'always' as const,
				queryKey: [...instanceKeys.all, 'installed-project-ids'],
				queryFn: listInstances,
				staleTime: 0,
			})
			.catch(handleError)
		if (!instances) return

		const ids = instances
			.map((gameInstance) => gameInstance.link?.project_id)
			.filter((id): id is string => !!id)
		debugLog('installedInstanceProjectIds loaded', { count: ids.length })
		installedProjectIds.value = ids
		return
	}

	const targetInstanceId = route.query.i as string
	const ids = await queryClient
		.fetchQuery({
			networkMode: 'always' as const,
			queryKey: instanceKeys.installedProjectIds(targetInstanceId, 'content'),
			queryFn: () => getInstalledProjectIds(targetInstanceId),
			staleTime: 0,
		})
		.catch(handleError)
	if (!ids) return

	debugLog('installedProjectIds loaded', { count: ids.length })
	installedProjectIds.value = ids
}

async function initInstanceContext() {
	debugLog('initInstanceContext', {
		queryI: route.query.i,
		queryAi: route.query.ai,
	})
	await Promise.all([
		refreshInstalledProjectIds(),
		route.query.i ? instanceQuery.suspense().catch(handleError) : Promise.resolve(),
	])

	if (route.query.i) {
		debugLog('instance loaded', {
			name: instance.value?.name,
			loader: instance.value?.loader,
			gameVersion: instance.value?.game_version,
		})
	}
}

function setHideInstalledModpacks(value: boolean) {
	appSettings.hideInstalledModpacks = value
	getSettings()
		.then((settings) => {
			settings.hide_installed_modpacks = value
			return setSettings(settings)
		})
		.catch(handleError)
}

const hideInstalledModpacks = computed({
	get: () => appSettings.hideInstalledModpacks,
	set: (value: boolean) => setHideInstalledModpacks(value),
})

const instanceFilters = computed(() => {
	const filters = []

	if (instance.value && projectType.value !== 'resourcepack') {
		const isVanillaShader = projectType.value === 'shader' && instance.value.loader === 'vanilla'
		const gameVersion = instance.value.game_version
		if (gameVersion && !isVanillaShader) {
			filters.push({ type: 'game_version', option: gameVersion })
		}

		const platform = instance.value.loader
		const supportedModLoaders = ['fabric', 'forge', 'quilt', 'neoforge']

		if (platform && projectType.value === 'mod' && supportedModLoaders.includes(platform)) {
			filters.push({ type: 'mod_loader', option: platform })
		}
		if (isVanillaShader) {
			filters.push({ type: 'shader_loader', option: 'vanilla' })
		}
	}

	if (
		(instance.value || projectType.value === 'modpack') &&
		(projectType.value === 'modpack' ? hideInstalledModpacks.value : instanceHideInstalled.value) &&
		hiddenInstanceProjectIds.value.size > 0
	) {
		for (const id of hiddenInstanceProjectIds.value) {
			filters.push({ type: 'project_id', option: `project_id:${id}`, negative: true })
		}
	}

	return filters
})

const combinedProvidedFilters = computed(() => instanceFilters.value)

const offline = ref(!navigator.onLine)
const handleOffline = () => {
	debugLog('went offline')
	offline.value = true
}
const handleOnline = () => {
	debugLog('went online')
	offline.value = false
}
window.addEventListener('offline', handleOffline)
window.addEventListener('online', handleOnline)

onBeforeUnmount(() => {
	window.removeEventListener('offline', handleOffline)
	window.removeEventListener('online', handleOnline)
})

const messages = defineMessages({
	projectActionsLabel: {
		id: 'app.browse.project-actions.label',
		defaultMessage: 'Project actions',
	},
	addToAnInstance: {
		id: 'app.browse.add-to-an-instance',
		defaultMessage: 'Add to an instance',
	},
	gameVersionProvidedByInstance: {
		id: 'search.filter.locked.instance-game-version.title',
		defaultMessage: 'Game version is provided by the instance',
	},
	hideInstalledModpacks: {
		id: 'app.browse.hide-installed-modpacks',
		defaultMessage: 'Hide already installed',
	},
	installing: {
		id: 'app.browse.server.installing',
		defaultMessage: 'Installing',
	},
	backToInstance: {
		id: 'app.browse.back-to-instance',
		defaultMessage: 'Back to instance',
	},
	modLoaderProvidedByInstance: {
		id: 'search.filter.locked.instance-loader.title',
		defaultMessage: 'Loader is provided by the instance',
	},
	modpacksProjectType: {
		id: 'app.browse.project-type.modpacks',
		defaultMessage: 'Modpacks',
	},
	modsProjectType: { id: 'app.browse.project-type.mods', defaultMessage: 'Mods' },
	resourcePacksProjectType: {
		id: 'app.browse.project-type.resource-packs',
		defaultMessage: 'Resource Packs',
	},
	dataPacksProjectType: {
		id: 'app.browse.project-type.data-packs',
		defaultMessage: 'Data Packs',
	},
	shadersProjectType: { id: 'app.browse.project-type.shaders', defaultMessage: 'Shaders' },
	providedByInstance: {
		id: 'search.filter.locked.instance',
		defaultMessage: 'Provided by the instance',
	},
	syncFilterButton: {
		id: 'search.filter.locked.instance.sync',
		defaultMessage: 'Sync with instance',
	},
})

const projectType = ref<ProjectType>(route.params.projectType as ProjectType)

function resetInstanceContext() {
	debugLog('instance context removed, resetting')
	installedProjectIds.value = null
	instanceHideInstalled.value = false
	newlyInstalled.value = []
	hiddenInstanceProjectIds.value = new Set()
	hiddenInstanceProjectIdsInitialized.value = false
	syncBreadcrumbs()
	void refreshInstalledProjectIds()
}

watch(
	() => route.params.projectType as ProjectType,
	async (newType) => {
		if (!browseRouteActive.value) {
			return
		}
		if (!newType || newType === projectType.value) return

		debugLog('projectType route param changed', { from: projectType.value, to: newType })
		projectType.value = newType
	},
)

watch(
	() => route.query.i,
	async (nextInstanceId, previousInstanceId) => {
		if (!route.path.startsWith('/browse') || nextInstanceId === previousInstanceId) return
		if (!nextInstanceId) {
			resetInstanceContext()
			return
		}

		installedProjectIds.value = null
		hiddenInstanceProjectIdsInitialized.value = false
		await Promise.all([instanceQuery.suspense().catch(handleError), refreshInstalledProjectIds()])
	},
)

const selectableProjectTypes = computed(() => {
	let dataPacks = false,
		mods = false,
		modpacks = false

	if (instance.value) {
		if (
			availableGameVersions.value &&
			availableGameVersions.value.findIndex((x) => x.version === instance.value?.game_version) <=
				availableGameVersions.value.findIndex((x) => x.version === '1.13')
		) {
			dataPacks = true
		}

		if (instance.value.loader !== 'vanilla') {
			mods = true
		}
	} else {
		dataPacks = true
		mods = true
		modpacks = true
	}

	const params: LocationQuery = {}

	if (route.query.i) params.i = route.query.i
	if (route.query.ai) params.ai = route.query.ai

	const queryString = new URLSearchParams(params as Record<string, string>).toString()
	const suffix = queryString ? `?${queryString}` : ''

	return [
		{
			label: formatMessage(messages.modpacksProjectType),
			href: `/browse/modpack${suffix}`,
			shown: modpacks,
		},
		{ label: formatMessage(messages.modsProjectType), href: `/browse/mod${suffix}`, shown: mods },
		{
			label: formatMessage(messages.resourcePacksProjectType),
			href: `/browse/resourcepack${suffix}`,
		},
		{
			label: formatMessage(messages.dataPacksProjectType),
			href: `/browse/datapack${suffix}`,
			shown: dataPacks,
		},
		{ label: formatMessage(messages.shadersProjectType), href: `/browse/shader${suffix}` },
	]
})

const installContext = computed(() => {
	if (instance.value) {
		return {
			name: instance.value.name,
			loader: instance.value.loader,
			gameVersion: instance.value.game_version,
			iconSrc: getInstanceIconUrl(instance.value.icon_path),
			backUrl: `/instance/${encodeURIComponent(instance.value.id)}`,
			backLabel: formatMessage(messages.backToInstance),
			heading: formatMessage(commonMessages.installingContentLabel),
		}
	}
	return null
})

const installingProjectIds = ref<Set<string>>(new Set())

function setProjectInstalling(projectId: string, installing: boolean) {
	const next = new Set(installingProjectIds.value)
	if (installing) {
		next.add(projectId)
	} else {
		next.delete(projectId)
	}
	installingProjectIds.value = next
}

function getCurrentSelectedInstallPreferences(projectTypeValue: string) {
	return getSelectedInstallPreferences({
		contentType: projectTypeValue,
		selectedFilters: searchState.currentFilters.value,
		providedFilters: combinedProvidedFilters.value,
		overriddenProvidedFilterTypes: searchState.overriddenProvidedFilterTypes.value,
	})
}

function getInstanceInstallTargetPreferences(projectTypeValue: string) {
	return getTargetInstallPreferences(
		{
			gameVersion: instance.value?.game_version,
			loader: instance.value?.loader,
		},
		projectTypeValue,
	)
}

async function getInstallProjectVersions(projectId: string) {
	const project = await get_project(projectId, 'must_revalidate')
	return (await get_version_many(
		project.versions,
		'must_revalidate',
	)) as ContentApi.Versions.v2.Version[]
}

async function chooseInstanceInstallVersion(
	project: ContentApi.Search.v3.ResultSearchProject,
	projectTypeValue: string,
) {
	const targetInstance = instance.value
	if (!targetInstance) {
		return { versionId: null as string | null }
	}

	const selectedPreferences = getCurrentSelectedInstallPreferences(projectTypeValue)
	const targetPreferences = getInstanceInstallTargetPreferences(projectTypeValue)
	if (!preferencesDiffer(selectedPreferences, targetPreferences)) {
		return { versionId: null as string | null }
	}

	const selectedVersion = getLatestMatchingInstallVersion(
		await getInstallProjectVersions(project.project_id),
		selectedPreferences,
		targetInstance.update_channel,
	)

	if (!selectedVersion) {
		return { versionId: null as string | null }
	}

	return { versionId: selectedVersion.id }
}

async function chooseFilterMatchingInstallVersion(
	project: ContentApi.Search.v3.ResultSearchProject,
	projectTypeValue: string,
) {
	const plan = await resolveInstallPlan({
		project: {
			project_id: project.project_id,
			title: project.title,
			icon_url: project.icon_url,
		},
		contentType: projectTypeValue as BrowseInstallContentType,
		selectedFilters: searchState.currentFilters.value,
		providedFilters: combinedProvidedFilters.value,
		overriddenProvidedFilterTypes: searchState.overriddenProvidedFilterTypes.value,
		targetPreferences: {},
		getProjectVersions: getInstallProjectVersions,
	})

	return { versionId: plan.versionId }
}

function getCardActions(
	result: ContentApi.Search.v3.ResultSearchProject,
	currentProjectType: string,
): CardAction[] {
	const projectResult = result as ContentApi.Search.v3.ResultSearchProject & {
		installed?: boolean
		installing?: boolean
	}
	const isInstalled =
		projectResult.installed || allInstalledIds.value.has(projectResult.project_id || '')
	const isInstalling = installingProjectIds.value.has(projectResult.project_id)
	const showAsInstalled = isInstalled && currentProjectType !== 'modpack'

	const isModpack = projectResult.project_types?.includes('modpack')
	const shouldUseInstallIcon = !!instance.value || isModpack

	return [
		{
			key: 'install',
			label: formatMessage(
				isInstalling
					? messages.installing
					: showAsInstalled
						? commonMessages.installedLabel
						: shouldUseInstallIcon
							? commonMessages.installButton
							: messages.addToAnInstance,
			),
			icon: isInstalling ? SpinnerIcon : showAsInstalled ? CheckIcon : PlusIcon,
			iconClass: isInstalling ? 'animate-spin' : undefined,
			disabled: showAsInstalled || isInstalling,
			color: 'brand',
			type: 'outlined',
			onClick: async () => {
				setProjectInstalling(projectResult.project_id, true)
				try {
					const selectedInstall = instance.value
						? await chooseInstanceInstallVersion(projectResult, currentProjectType)
						: isModpack
							? await chooseFilterMatchingInstallVersion(projectResult, currentProjectType)
							: { versionId: null as string | null }
					if (selectedInstall === null) {
						setProjectInstalling(projectResult.project_id, false)
						return
					}
					const selectedPreferences = getCurrentSelectedInstallPreferences(currentProjectType)
					await installVersion(
						projectResult.project_id,
						selectedInstall.versionId,
						instance.value ? instance.value.id : null,
						'SearchCard',
						(versionId, installedProjectIds) => {
							setProjectInstalling(projectResult.project_id, false)
							if (versionId) {
								onSearchResultsInstalled(installedProjectIds ?? [projectResult.project_id])
							}
						},
						(profile) => {
							router.push(`/instance/${profile}`)
						},
						{
							preferredLoader: instance.value?.loader ?? selectedPreferences.loaders?.[0],
							preferredGameVersion:
								instance.value?.game_version ?? selectedPreferences.gameVersions?.[0],
						},
					)
				} catch (err) {
					setProjectInstalling(projectResult.project_id, false)
					handleError(err)
				}
			},
		},
	]
}

function onSearchResultInstalled(id: string) {
	if (!newlyInstalled.value.includes(id)) {
		newlyInstalled.value = [...newlyInstalled.value, id]
	}
}

function onSearchResultsInstalled(ids: string[]) {
	newlyInstalled.value = Array.from(new Set([...newlyInstalled.value, ...ids]))
}

async function search(requestParams: string) {
	debugLog('searching v3', requestParams)

	const rawResults = await queryClient.fetchQuery({
		networkMode: 'always' as const,
		queryKey: ['search', 'v3', requestParams],
		queryFn: () =>
			get_search_results_v3(requestParams, 'must_revalidate') as Promise<{
				result: ContentApi.Search.v3.SearchResults & {
					hits: (ContentApi.Search.v3.ResultSearchProject & { installed?: boolean })[]
				}
			} | null>,
		staleTime: 30_000,
	})

	if (!rawResults) {
		return {
			projectHits: [],
			total_hits: 0,
			per_page: 20,
		}
	}

	for (const hit of rawResults.result.hits) {
		for (const identifier of [hit.project_id, hit.slug]) {
			if (identifier) {
				queryClient.setQueryData(['projects', 'summary', identifier], hit)
			}
		}
	}

	const hits = rawResults.result.hits.map((hit) => {
		const mapped: ContentApi.Search.v3.ResultSearchProject & { installed?: boolean } = {
			...hit,
		}

		if (instance.value || projectType.value === 'modpack') {
			const installedIds = new Set([...newlyInstalled.value, ...(installedProjectIds.value ?? [])])
			mapped.installed = installedIds.has(hit.project_id)
		}

		return mapped
	})

	return {
		projectHits: hits,
		total_hits: rawResults.result.total_hits,
		per_page: rawResults.result.hits_per_page,
	}
}

const lockedFilterMessages = computed(() => ({
	gameVersion: formatMessage(messages.gameVersionProvidedByInstance),
	modLoader: formatMessage(messages.modLoaderProvidedByInstance),
	syncButton: formatMessage(messages.syncFilterButton),
	providedBy: formatMessage(messages.providedByInstance),
}))

const searchState = useBrowseSearch({
	projectType,
	tags,
	active: browseRouteActive,
	providedFilters: combinedProvidedFilters,
	search,
	persistentQueryParams: ['i', 'ai'],
	getExtraQueryParams: () => ({
		ai: instanceHideInstalled.value ? 'true' : undefined,
	}),
})

watch(
	[() => searchState.query.value, () => searchState.currentFilters.value, () => projectType.value],
	() => {
		if (instance.value || projectType.value === 'modpack') {
			syncHiddenInstanceProjectIds()
		}
	},
	{ deep: true },
)

void searchState.refreshSearch()

useAppEvent('instance', async (event) => {
	if (event.event === 'created' || event.event === 'removed') {
		if (!route.query.i) {
			await refreshInstalledProjectIds()
			if (projectType.value === 'modpack') {
				if (event.event === 'removed') {
					syncHiddenInstanceProjectIds()
				}
				await searchState.refreshSearch()
			}
		}
	}

	if (instance.value && event.instance_id === instance.value.id && event.event === 'synced') {
		await refreshInstalledProjectIds()
		await searchState.refreshSearch()
	}
})

function getProjectBrowseQuery() {
	if (!browseRouteActive.value) {
		return undefined
	}
	if (!installContext.value) return undefined
	return {
		...route.query,
		b: route.fullPath,
	}
}

const advancedFiltersCollapsed = computed({
	get: () => appSettings.advancedFiltersCollapsed,
	set: (value) => {
		appSettings.advancedFiltersCollapsed = value
		getSettings()
			.then((settings) => {
				settings.advanced_filters_collapsed = value
				return setSettings(settings)
			})
			.catch(handleError)
	},
})

const dismissedPhotosensitivityFilterWarning = computed({
	get: () => appSettings.dismissedPhotosensitivityFilterWarning,
	set: (value) => {
		appSettings.dismissedPhotosensitivityFilterWarning = value
		getSettings()
			.then((settings) => {
				settings.dismissed_photosensitivity_filter_warning = value
				return setSettings(settings)
			})
			.catch(handleError)
	},
})

provideBrowseManager({
	tags,
	projectType,
	...searchState,
	advancedFiltersCollapsed,
	dismissedPhotosensitivityFilterWarning,
	getProjectLink: (result: ContentApi.Search.v3.ResultSearchProject) => ({
		path: `/project/${result.project_id ?? result.slug}`,
		query: {
			...getProjectBrowseQuery(),
			...getProjectVersionFilterQuery({
				contentType: projectType.value,
				selectedFilters: searchState.currentFilters.value,
				providedFilters: combinedProvidedFilters.value,
				overriddenProvidedFilterTypes: searchState.overriddenProvidedFilterTypes.value,
			}),
		},
	}),
	selectableProjectTypes,
	showProjectTypeTabs: computed(() => true),
	variant: 'app',
	getCardActions,
	installContext,
	providedFilters: combinedProvidedFilters,
	hideInstalled: computed({
		get: () => {
			if (projectType.value === 'modpack') return hideInstalledModpacks.value
			return instanceHideInstalled.value
		},
		set: (val: boolean) => {
			if (projectType.value === 'modpack') {
				hideInstalledModpacks.value = val
				if (val) syncHiddenInstanceProjectIds()
				return
			}
			instanceHideInstalled.value = val
			if (val) syncHiddenInstanceProjectIds()
		},
	}),
	showHideInstalled: computed(() => projectType.value === 'modpack' || !!instance.value),
	hideInstalledLabel: computed(() =>
		formatMessage(
			projectType.value === 'modpack'
				? messages.hideInstalledModpacks
				: commonMessages.hideInstalledContentLabel,
		),
	),
	onInstalled: onSearchResultInstalled,
	offline,
	lockedFilterMessages,
})
</script>

<template>
	<div class="flex flex-col gap-2 p-6">
		<BrowsePageLayout />
		<Teleport v-if="browseRouteActive" to="#sidebar-teleport-target">
			<BrowseSidebar />
		</Teleport>
	</div>
</template>
