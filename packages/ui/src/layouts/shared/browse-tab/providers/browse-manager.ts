import type { ContentApi } from '@crafton/api-client'
import type { Component, ComputedRef, MaybeRef, Ref, ShallowRef } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { createContext } from '#ui/providers/create-context'
import type { FilterType, FilterValue, ServerContentEnvironment, SortType } from '#ui/utils/search'

import type { BrowseInstallContext, BrowseSearchResponse, CardAction } from '../types'

export interface BrowseManagerContext {
	tags: Ref<{
		gameVersions: ContentApi.Tags.v2.GameVersion[]
		loaders: ContentApi.Tags.v2.Loader[]
		categories: ContentApi.Tags.v2.Category[]
	}>
	projectType: Ref<string>

	query: Ref<string>
	filters: ComputedRef<FilterType[]>
	currentFilters: Ref<FilterValue[]>
	toggledGroups: Ref<string[]>
	overriddenProvidedFilterTypes: Ref<string[]>
	effectiveSortTypes: ComputedRef<readonly SortType[]>
	effectiveCurrentSortType: Ref<SortType>
	loading: Ref<boolean>
	refreshing: Ref<boolean>
	projectHits: ShallowRef<BrowseSearchResponse['projectHits']>
	totalHits: Ref<number>
	pageCount: ComputedRef<number>
	maxResults: Ref<number>
	currentPage: Ref<number>
	effectiveLayout: ComputedRef<'list' | 'grid'>
	deprioritizedTags: ComputedRef<string[]>
	excludeLoaders: ComputedRef<boolean>
	refreshSearch: () => Promise<void>
	setPage: (page: number) => Promise<void>
	clearSearch: () => void
	onFilterChange: () => void
	linkOverridesAdvancedPrefs: Ref<boolean>
	applySavedAdvancedPrefs: () => void

	getProjectLink: (result: ContentApi.Search.v3.ResultSearchProject) => string | RouteLocationRaw

	selectableProjectTypes: ComputedRef<{ label: string; href: string; shown?: boolean }[]>
	showProjectTypeTabs: ComputedRef<boolean>

	variant: 'app' | 'web'

	getCardActions?: (
		result: ContentApi.Search.v3.ResultSearchProject,
		projectType: string,
	) => CardAction[]

	installContext?: ComputedRef<BrowseInstallContext | null>
	providedFilters?: ComputedRef<FilterValue[]>
	hideInstalled?: Ref<boolean>
	showHideInstalled?: ComputedRef<boolean>
	hideInstalledLabel?: ComputedRef<string>
	hideSelected?: Ref<boolean>
	showHideSelected?: ComputedRef<boolean>
	hideSelectedLabel?: ComputedRef<string>
	serverEnvironment?: Ref<ServerContentEnvironment | null>
	showServerEnvironment?: ComputedRef<boolean>
	hiddenFilterTypes?: ComputedRef<string[]>
	advancedFiltersCollapsed?: Ref<boolean>
	dismissedPhotosensitivityFilterWarning?: Ref<boolean>
	onInstalled?: (projectId: string) => void

	displayMode?: Ref<'list' | 'grid' | 'gallery'> | ComputedRef<'list' | 'grid' | 'gallery'>
	cycleDisplayMode?: () => void
	maxResultsOptions?: ComputedRef<number[]>

	onProjectHover?: (result: ContentApi.Search.v3.ResultSearchProject) => void
	onProjectHoverEnd?: () => void
	onContextMenu?: (event: MouseEvent, result: ContentApi.Search.v3.ResultSearchProject) => void
	offline?: Ref<boolean>

	filtersMenuOpen?: Ref<boolean>

	lockedFilterMessages?: MaybeRef<{
		gameVersion?: string
		modLoader?: string
		environment?: string
		syncButton?: string
		providedBy?: string
		gameVersionShaderMessage?: string
	}>

	loadingComponent?: Component
}

export const [injectBrowseManager, provideBrowseManager] = createContext<BrowseManagerContext>(
	'BrowsePageLayout',
	'browseManagerContext',
)
