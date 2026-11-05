<template>
	<div v-if="data">
		<Teleport to="#sidebar-teleport-target">
			<ProjectSidebarCompatibility
				:project="data"
				:tags="{ loaders: allLoaders, gameVersions: allGameVersions }"
				:project-v3="projectV3"
				class="project-sidebar-section"
			/>
			<ProjectSidebarLinks
				link-target="_blank"
				:project="data"
				:project-v3="projectV3"
				class="project-sidebar-section"
			/>
			<ProjectSidebarTags :project="data" class="project-sidebar-section" />
			<ProjectSidebarCreators
				:organization="organization"
				:members="members"
				:user-link-target="null"
				class="project-sidebar-section"
			/>
			<ProjectSidebarDetails
				:project="data"
				:has-versions="versions.length > 0"
				:link-target="`_blank`"
				class="project-sidebar-section"
			/>
		</Teleport>
		<div class="flex flex-col gap-4 p-6">
			<div
				v-if="projectInstallContext"
				class="sticky top-0 z-20 -mx-6 -mt-6 rounded-tl-[--radius-xl] border-0 border-b border-solid bg-surface-1 px-6 py-4 border-surface-5"
			>
				<BrowseInstallHeader :install-context="projectHeaderInstallContext" />
			</div>
			<InstanceIndicator v-if="instance && !projectInstallContext" :instance="instance" />
			<template v-if="data">
				<Teleport
					v-if="appSettings.featureFlags.project_background"
					to="#background-teleport-target"
				>
					<ProjectBackgroundGradient :project="data" />
				</Teleport>
				<ProjectPageHeader
					v-else
					:project="data"
					:project-v3="projectV3"
					:show-status-badge="data.status !== 'approved'"
					@contextmenu.prevent.stop="handleRightClick"
					@category="(category) => router.push(`${projectSearchUrl}?f=categories:${category}`)"
				>
					<template #actions>
						<Button
							v-if="showSwitchVersion && onVersionsPage"
							v-tooltip="formatMessage(messages.alreadyInstalled)"
							size="xl"
							native-type="button"
							disabled
						>
							<CheckIcon />
							{{ formatMessage(commonMessages.installedLabel) }}
						</Button>
						<Button
							v-else-if="showSwitchVersion"
							size="xl"
							native-type="button"
							@click="goToVersions"
						>
							<SwapIcon />
							{{ formatMessage(messages.switchVersion) }}
						</Button>
						<Button
							v-else
							v-tooltip="
								installButtonInstalled ? formatMessage(messages.alreadyInstalled) : undefined
							"
							type="colored"
							color="brand"
							size="xl"
							native-type="button"
							:disabled="installButtonDisabled"
							@click="install(null)"
						>
							<component :is="installButtonIcon" :class="installButtonIconClass" />
							{{
								installButtonInstalled
									? formatMessage(commonMessages.installedLabel)
									: installButtonLoading
										? formatMessage(commonMessages.installingLabel)
										: formatMessage(commonMessages.installButton)
							}}
						</Button>
					</template>
				</ProjectPageHeader>
				<NavTabs
					:links="[
						{
							label: formatMessage(messages.descriptionTab),
							href: projectDescriptionHref,
						},
						{
							label: formatMessage(messages.versionsTab),
							href: versionsHref,
							subpages: ['version'],
							shown: projectV3?.minecraft_server == null,
						},
						{
							label: formatMessage(messages.galleryTab),
							href: projectGalleryHref,
							shown: data.gallery.length > 0,
						},
					]"
				/>
				<RouterView
					:route="displayedProjectRoute"
					:project="data"
					:versions="versions"
					:members="members"
					:instance="instance"
					:install="install"
					:installed="installed"
					:installing="installing"
					:installed-version="installedVersion"
					:loader-tags="allLoaders ?? []"
					:game-version-tags="allGameVersions ?? []"
				/>
			</template>
			<template v-else>{{ formatMessage(messages.loadError) }}</template>
		</div>
		<SelectedProjectsFloatingBar
			v-if="projectInstallContext"
			:install-context="projectInstallContext"
		/>
		<ContextMenu ref="options" :label="formatMessage(messages.projectActionsLabel)">
			<template #open_link="{ option }">
				<GlobeIcon /> {{ option.label }} <ExternalIcon />
			</template>
		</ContextMenu>
	</div>
</template>

<script setup>
import { CheckIcon, DownloadIcon, ExternalIcon, GlobeIcon, SpinnerIcon } from '@crafton/assets'
import {
	BrowseInstallHeader,
	Button,
	commonMessages,
	ContextMenu,
	defineMessages,
	injectNotificationManager,
	NavTabs,
	ProjectBackgroundGradient,
	ProjectPageHeader,
	ProjectSidebarCompatibility,
	ProjectSidebarCreators,
	ProjectSidebarDetails,
	ProjectSidebarLinks,
	ProjectSidebarTags,
	SelectedProjectsFloatingBar,
	useVIntl,
} from '@crafton/ui'
import { useQueryClient } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { computed, ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { SwapIcon } from '@/assets/icons/index.js'
import InstanceIndicator from '@/components/ui/InstanceIndicator.vue'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import {
	get_organization,
	get_project,
	get_project_v3,
	get_team,
	get_version_many,
} from '@/helpers/cache.js'
import {
	get as getInstance,
	get_projects as getInstanceProjects,
	getInstanceIconUrl,
} from '@/helpers/instance'
import { get_categories, get_game_versions, get_loaders } from '@/helpers/tags'
import { injectContentInstall } from '@/providers/content-install'
import { provideBreadcrumbParent, useBreadcrumb } from '@/shared/breadcrumbs'

dayjs.extend(relativeTime)

const { handleError } = injectNotificationManager()
const { install: installVersion } = injectContentInstall()
const route = useRoute()
const router = useRouter()
const queryClient = useQueryClient()

const displayedProjectRoute = shallowRef(router.currentRoute.value)
watch(
	() => router.currentRoute.value,
	(nextRoute) => {
		if (nextRoute.path.startsWith('/project/')) {
			displayedProjectRoute.value = nextRoute
		}
	},
	{ immediate: true },
)
const projectBreadcrumbTo = computed(() => {
	const currentRoute = displayedProjectRoute.value
	if (currentRoute.name === 'Version') {
		return {
			name: 'Versions',
			params: { id: currentRoute.params.id },
			query: currentRoute.query,
		}
	}

	return currentRoute.fullPath
})
const appSettings = useAppSettings()
const { formatMessage } = useVIntl()

const messages = defineMessages({
	moreOptions: { id: 'app.project.more-options', defaultMessage: 'More options' },
	projectActionsLabel: { id: 'app.project.actions.label', defaultMessage: 'Project actions' },
	descriptionTab: { id: 'app.project.tab.description', defaultMessage: 'Description' },
	versionsTab: { id: 'app.project.tab.versions', defaultMessage: 'Versions' },
	galleryTab: { id: 'app.project.tab.gallery', defaultMessage: 'Gallery' },
	loadError: {
		id: 'app.project.load-error',
		defaultMessage: 'Project data could not be loaded.',
	},
	comingSoon: { id: 'app.project.coming-soon', defaultMessage: 'Coming soon' },
	backToBrowse: {
		id: 'app.project.install-context.back-to-browse',
		defaultMessage: 'Back to discover',
	},
	backToInstance: {
		id: 'app.project.install-context.back-to-instance',
		defaultMessage: 'Back to instance',
	},
	alreadyInstalled: {
		id: 'app.project.install-button.already-installed',
		defaultMessage: 'This project is already installed',
	},
	switchVersion: {
		id: 'app.project.install-button.switch-version',
		defaultMessage: 'Switch version',
	},
})

const installing = ref(false)
const data = shallowRef(null)

function getProjectBreadcrumbSummary(projectId) {
	const identifier = Array.isArray(projectId) ? projectId[0] : projectId
	if (typeof identifier !== 'string' || !identifier) return undefined

	return queryClient.getQueryData(['projects', 'summary', identifier])
}

function getProjectBreadcrumbLabel(projectId) {
	const summary = getProjectBreadcrumbSummary(projectId)
	return summary?.name ?? summary?.title ?? formatMessage(commonMessages.loadingLabel)
}

const projectBreadcrumbLabel = ref(getProjectBreadcrumbLabel(route.params.id))
const projectBreadcrumb = useBreadcrumb({
	slot: 'project',
	id: () => `project:${String(displayedProjectRoute.value.params.id ?? '')}`,
	label: projectBreadcrumbLabel,
	visual: () => {
		const identifier = String(displayedProjectRoute.value.params.id ?? '')
		const loadedProject =
			data.value?.id === identifier || data.value?.slug === identifier ? data.value : undefined
		const project = loadedProject ?? getProjectBreadcrumbSummary(identifier)
		return {
			type: 'image',
			src: project?.icon_url,
			alt: projectBreadcrumbLabel.value,
			tintBy: identifier,
		}
	},
	to: projectBreadcrumbTo,
})
provideBreadcrumbParent(projectBreadcrumb)

const versions = shallowRef([])
const members = shallowRef([])
const categories = shallowRef([])
const organization = shallowRef(null)
const instance = ref(null)
const instanceProjects = ref(null)

const installed = ref(false)
const installedVersion = ref(null)
const projectV3 = shallowRef(null)

const instanceFilters = computed(() => {
	if (!instance.value) {
		return {}
	}

	const loaders = []
	if (data.value.project_type === 'mod') {
		if (instance.value.loader !== 'vanilla') {
			loaders.push(instance.value.loader)
		}
		if (instance.value.loader === 'vanilla' || data.value.loaders.includes('datapack')) {
			loaders.push('datapack')
		}
	}

	return { l: loaders, g: instance.value.game_version }
})

function buildProjectHref(path, extraQuery = {}) {
	const params = new URLSearchParams()
	for (const [key, val] of Object.entries({ ...route.query, ...extraQuery })) {
		if (Array.isArray(val)) {
			for (const v of val) params.append(key, v)
		} else if (val) {
			params.append(key, String(val))
		}
	}
	const qs = params.toString()
	return qs ? `${path}?${qs}` : path
}

function buildBrowseHref(path) {
	const params = new URLSearchParams()
	for (const [key, val] of Object.entries(route.query)) {
		if (key === 'b' || key === 'g' || key === 'l') continue
		if (Array.isArray(val)) {
			for (const v of val) params.append(key, v)
		} else if (val) {
			params.append(key, String(val))
		}
	}
	const qs = params.toString()
	return qs ? `${path}?${qs}` : path
}

const projectDescriptionHref = computed(() => buildProjectHref(`/project/${route.params.id}`))
const versionsHref = computed(() =>
	buildProjectHref(`/project/${route.params.id}/versions`, instanceFilters.value),
)
const projectGalleryHref = computed(() => buildProjectHref(`/project/${route.params.id}/gallery`))

const projectBrowseBackUrl = computed(() => {
	const browsePath = route.query.b
	if (typeof browsePath === 'string' && browsePath.startsWith('/browse/')) return browsePath
	const instanceId = route.query.i
	if (typeof instanceId === 'string' && instanceId) {
		return `/instance/${encodeURIComponent(instanceId)}`
	}
	const type = data.value?.project_type ? `${data.value.project_type}` : 'mod'
	return buildBrowseHref(`/browse/${type}`)
})
const projectBackLabel = computed(() => {
	if (typeof route.query.b === 'string') return formatMessage(messages.backToBrowse)
	return typeof route.query.i === 'string'
		? formatMessage(messages.backToInstance)
		: formatMessage(messages.backToBrowse)
})

const projectInstallContext = computed(() => {
	if (instance.value) {
		return {
			name: instance.value.name,
			loader: instance.value.loader,
			gameVersion: instance.value.game_version,
			iconSrc: getInstanceIconUrl(instance.value.icon_path),
			backUrl: projectBrowseBackUrl.value,
			backLabel: projectBackLabel.value,
			heading: formatMessage(commonMessages.installingContentLabel),
		}
	}

	return null
})

/**
 * Going back from a project returns to browse, where the selection is still shown, so the header
 * skips the "selected projects not installed yet" prompt that would otherwise leave to the server.
 */
const projectHeaderInstallContext = computed(() => {
	const context = projectInstallContext.value
	if (!context) return null
	return {
		...context,
		selectedProjects: [],
		isInstallingSelected: false,
	}
})

const installButtonLoading = computed(() => installing.value)
const installButtonInstalled = computed(() => installed.value)
const installButtonDisabled = computed(
	() => installButtonInstalled.value || installButtonLoading.value,
)
const installButtonIcon = computed(() => {
	if (installButtonLoading.value && !installButtonInstalled.value) return SpinnerIcon
	if (!installButtonInstalled.value) return DownloadIcon
	return CheckIcon
})
const installButtonIconClass = computed(() =>
	installButtonLoading.value && !installButtonInstalled.value ? 'animate-spin' : undefined,
)
const projectSearchUrl = computed(() => `/browse/${data.value?.project_type}`)

const showSwitchVersion = computed(() => !!instance.value && installed.value)
const onVersionsPage = computed(() => route.name === 'Versions')

function goToVersions() {
	router.push(versionsHref.value)
}

const [allLoaders, allGameVersions] = await Promise.all([
	get_loaders().catch(handleError).then(ref),
	get_game_versions().catch(handleError).then(ref),
])

async function fetchProjectData() {
	const requestedId = String(route.params.id ?? '')
	projectBreadcrumbLabel.value = getProjectBreadcrumbLabel(requestedId)
	const [project, projectV3Result] = await Promise.all([
		get_project(requestedId, 'must_revalidate').catch(handleError),
		get_project_v3(requestedId, 'must_revalidate').catch(handleError),
	])
	if (String(route.params.id ?? '') !== requestedId) {
		return
	}

	projectV3.value = projectV3Result

	if (!project) {
		handleError('Error loading project')
		return
	}

	data.value = project
	projectBreadcrumbLabel.value = project.title
	;[versions.value, members.value, categories.value, instance.value, instanceProjects.value] =
		await Promise.all([
			get_version_many(project.versions, 'must_revalidate').catch(handleError),
			get_team(project.team).catch(handleError),
			get_categories().catch(handleError),
			route.query.i ? getInstance(route.query.i).catch(handleError) : Promise.resolve(),
			route.query.i ? getInstanceProjects(route.query.i).catch(handleError) : Promise.resolve(),
		])
	if (String(route.params.id ?? '') !== requestedId) {
		return
	}

	for (const member of members.value ?? []) {
		for (const identifier of [member.user.id, member.user.username]) {
			if (identifier) {
				queryClient.setQueryData(['users', 'summary', identifier], member.user)
			}
		}
	}

	versions.value = versions.value.sort((a, b) => dayjs(b.date_published) - dayjs(a.date_published))

	const installedFile = instanceProjects.value
		? Object.values(instanceProjects.value).find(
				(x) => x.metadata && x.metadata.project_id === data.value.id,
			)
		: undefined
	installed.value = !!installedFile
	installedVersion.value = installedFile?.metadata.version_id ?? null

	if (project.organization) {
		organization.value = await get_organization(project.organization).catch(handleError)
	} else {
		organization.value = null
	}
}

await fetchProjectData()

watch(
	() => route.params.id,
	async () => {
		if (route.params.id && route.path.startsWith('/project')) {
			await fetchProjectData()
		}
	},
)

async function install(version) {
	installing.value = true
	await installVersion(
		data.value.id,
		version,
		instance.value ? instance.value.id : null,
		'ProjectPage',
		(version, installedProjectIds) => {
			installing.value = false

			const installedIds = installedProjectIds ?? [data.value.id]
			if (instance.value && version && installedIds.includes(data.value.id)) {
				installed.value = true
				installedVersion.value = version
			}
		},
		(profile) => {
			router.push(`/instance/${profile}`)
		},
	).catch(handleError)
}

const options = ref(null)
const handleRightClick = (event) => {
	options.value.open(event, [
		{
			id: 'install',
			label: formatMessage(commonMessages.installButton),
			icon: DownloadIcon,
			action: () => install(null),
		},
	])
}
</script>

<style scoped lang="scss">
.root-container {
	display: flex;
	flex-direction: row;
	min-height: 100%;
}

.project-sidebar {
	position: fixed;
	width: calc(300px + 1.5rem);
	min-height: calc(100vh - 3.25rem);
	height: fit-content;
	max-height: calc(100vh - 3.25rem);
	padding: 1rem 0.5rem 1rem 1rem;
	overflow-y: auto;
	-ms-overflow-style: none;
	scrollbar-width: none;

	&::-webkit-scrollbar {
		width: 0;
		background: transparent;
	}
}

.sidebar-card {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

.content-container {
	display: flex;
	flex-direction: column;
	width: 100%;
	padding: 1rem;
	margin-left: calc(300px + 1rem);
}

.button-group {
	display: flex;
	flex-wrap: wrap;
	flex-direction: row;
	gap: 0.5rem;
}

.stats {
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
	gap: var(--gap-md);

	.stat {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: fit-content;
		gap: var(--gap-xs);
		--stat-strong-size: 1.25rem;

		strong {
			font-size: var(--stat-strong-size);
		}

		p {
			margin: 0;
		}

		svg {
			min-height: var(--stat-strong-size);
			min-width: var(--stat-strong-size);
		}
	}

	.date {
		margin-top: auto;
	}
}

.tabs {
	display: flex;
	flex-direction: row;
	gap: 1rem;
	margin-bottom: var(--gap-md);
	justify-content: space-between;

	.tab {
		display: flex;
		flex-direction: row;
		align-items: center;
		border-radius: var(--border-radius);
		cursor: pointer;
		transition: background-color 0.2s ease-in-out;

		&:hover {
			background-color: var(--color-raised-bg);
		}

		&.router-view-active {
			background-color: var(--color-raised-bg);
		}
	}
}

.links {
	a {
		display: inline-flex;
		align-items: center;
		border-radius: 1rem;
		color: var(--color-text);

		svg,
		img {
			height: 1rem;
			width: 1rem;
		}

		span {
			margin-left: 0.25rem;
			text-decoration: underline;
			line-height: 2rem;
		}

		&:focus-visible,
		&:hover {
			svg,
			img,
			span {
				color: var(--color-heading);
			}
		}

		&:active {
			svg,
			img,
			span {
				color: var(--color-text-dark);
			}
		}

		&:not(:last-child)::after {
			content: '•';
			margin: 0 0.25rem;
		}
	}
}

.install-loading {
	scale: 0.2;
	height: 1rem;
	width: 1rem;
	margin-right: -1rem;

	:deep(svg) {
		color: var(--color-contrast);
	}
}

.project-sidebar-section {
	@apply p-4 flex flex-col gap-2 border-0 border-b-[1px] border-[--brand-gradient-border] border-solid;
}
</style>
