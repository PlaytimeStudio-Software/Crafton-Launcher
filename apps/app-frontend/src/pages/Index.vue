<script setup lang="ts">
import { PlusIcon } from '@crafton/assets'
import { ContextMenu, defineMessages, injectNotificationManager, useVIntl } from '@crafton/ui'
import { useQuery } from '@tanstack/vue-query'
import dayjs from 'dayjs'
import { computed, inject, ref } from 'vue'

import homeIcon from '@/assets/redesign/icon-home.webp'
import playIcon from '@/assets/redesign/icon-play.webp'
import FeaturedPackCard from '@/components/ui/FeaturedPackCard.vue'
import ActivityPanel from '@/components/ui/home/ActivityPanel.vue'
import HomePanel from '@/components/ui/home/HomePanel.vue'
import QuickActions from '@/components/ui/home/QuickActions.vue'
import WelcomeScreen from '@/components/ui/WelcomeScreen.vue'
import RecentWorldsList from '@/components/ui/world/RecentWorldsList.vue'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { FEATURED_PACKS } from '@/config/featured-pack'
import { useHiddenInstances } from '@/features/library/hidden-instances/use-hidden-instances'
import { get_all as getProcesses } from '@/helpers/process'
import { traceStartupStep } from '@/helpers/startup-debug'
import { instanceListQueryOptions } from '@/pages/instance/query-options'
import { skipCreateInstanceOnboarding } from '@/platform/app-lib/onboarding-checklist/commands'
import { injectOnboardingChecklist } from '@/providers/onboarding-checklist'
import { useRootBreadcrumb } from '@/shared/breadcrumbs'

defineOptions({
	name: 'HomePage',
})

const { formatMessage } = useVIntl()
const { handleError } = injectNotificationManager()
const { hasCreatedInstance, isReady } = injectOnboardingChecklist()
const showCreationModal = inject<() => void>('showCreationModal')
const pageOptions = ref<InstanceType<typeof ContextMenu>>()
const appSettings = useAppSettings()
const { hiddenIds: hiddenInstanceIds } = useHiddenInstances()

const messages = defineMessages({
	home: {
		id: 'app.navigation.home',
		defaultMessage: 'Home',
	},
	newInstance: {
		id: 'app.library.context-menu.create-instance',
		defaultMessage: 'New instance',
	},
	libraryActionsLabel: {
		id: 'app.library.actions.label',
		defaultMessage: 'Library actions',
	},
})

useRootBreadcrumb({
	slot: 'root',
	id: 'home',
	label: formatMessage(messages.home),
	to: '/',
	visual: { type: 'image', src: homeIcon, alt: '' },
})

function skipWelcomeScreen() {
	skipCreateInstanceOnboarding().catch(handleError)
}

const instancesQuery = useQuery(instanceListQueryOptions())
const instances = computed(() => instancesQuery.data.value ?? [])
if (hasCreatedInstance.value) {
	await traceStartupStep('Load library instances', () => instancesQuery.suspense()).catch(
		handleError,
	)
}

const recentInstances = computed(() =>
	instances.value
		.filter((instance) => !hiddenInstanceIds.value.has(instance.id))
		.sort((a, b) => dayjs(b.last_played ?? b.created).diff(dayjs(a.last_played ?? a.created))),
)

const processesQuery = useQuery({
	queryKey: ['processes', 'list'],
	networkMode: 'always',
	queryFn: (): Promise<{ instance_id: string }[]> => getProcesses(),
})
const runningIds = computed(() =>
	(processesQuery.data.value ?? []).map((process) => process.instance_id),
)

const heroPack = FEATURED_PACKS[0]

function openPageContextMenu(event: MouseEvent) {
	if (
		!(event.target instanceof HTMLElement) ||
		!event.target.hasAttribute('data-library-page-background')
	) {
		return
	}

	event.preventDefault()
	event.stopPropagation()
	pageOptions.value?.open(event, [
		{
			id: 'new_instance',
			label: formatMessage(messages.newInstance),
			icon: PlusIcon,
			action: () => showCreationModal?.(),
		},
	])
}
</script>

<template>
	<WelcomeScreen v-if="isReady && !hasCreatedInstance" @skip="skipWelcomeScreen" />
	<div
		v-else-if="isReady"
		data-library-page-background
		class="home-page p-6"
		@contextmenu="openPageContextMenu"
	>
		<div data-library-page-background class="home-grid">
			<div class="home-grid__hero">
				<FeaturedPackCard v-if="heroPack" :pack="heroPack" hero />
			</div>
			<ActivityPanel
				class="home-grid__activity"
				:instances="recentInstances"
				:running-ids="runningIds"
			/>
			<HomePanel class="home-grid__jump" title="Jump Back In" :icon="playIcon">
				<template #actions>
					<RouterLink to="/library" class="text-sm font-semibold text-brand hover:underline">
						View all &rarr;
					</RouterLink>
				</template>
				<RecentWorldsList
					v-if="recentInstances?.length > 0 && appSettings.showJumpIn"
					:recent-instances="recentInstances"
					bare
				/>
				<p v-else class="m-0 text-sm text-secondary">
					Instances and worlds you play will show up here.
				</p>
			</HomePanel>
			<QuickActions class="home-grid__actions" />
		</div>
		<ContextMenu ref="pageOptions" :label="formatMessage(messages.libraryActionsLabel)" />
	</div>
</template>

<style scoped lang="scss">
.home-page {
	container-type: inline-size;
}

.home-grid {
	display: grid;
	grid-template-columns: minmax(0, 2fr) minmax(17rem, 1fr);
	grid-template-areas:
		'hero activity'
		'jump actions';
	align-items: start;
	gap: 1rem;
}

.home-grid__hero {
	grid-area: hero;
	min-width: 0;
}

.home-grid__activity {
	grid-area: activity;
	align-self: stretch;
}

.home-grid__jump {
	grid-area: jump;
	align-self: stretch;
}

.home-grid__actions {
	grid-area: actions;
}

/* When the account panel is open the page is narrower: give the banner the whole row. */
@container (max-width: 1150px) {
	.home-grid {
		grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem);
		grid-template-areas:
			'hero hero'
			'jump activity'
			'jump actions';
	}
}

@container (max-width: 560px) {
	.home-grid {
		grid-template-columns: minmax(0, 1fr);
		grid-template-areas: 'hero' 'actions' 'jump' 'activity';
	}
}
</style>
