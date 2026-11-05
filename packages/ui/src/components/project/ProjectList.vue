<template>
	<ProjectCardList :layout="layout">
		<template v-for="project in projects" :key="project.id">
			<ProjectCard
				:link="getProjectPagePath(project, linkMode)"
				:title="project.name"
				:icon-url="project.icon_url"
				:date-updated="project.updated"
				:downloads="project.downloads"
				:summary="project.summary"
				:tags="getProjectCardTags(project)"
				:all-tags="getProjectCardAllTags(project)"
				:followers="project.followers"
				:banner="project.gallery?.find((image) => image.featured)?.url"
				:color="project.color"
				:environment="project.environment?.[0]"
				:layout="cardLayout"
				:status="statusFor(project)"
			>
				<template v-if="$slots.actions" #actions>
					<slot name="actions" :project="project" />
				</template>
			</ProjectCard>
		</template>
	</ProjectCardList>
</template>

<script setup lang="ts">
import type { ContentApi } from '@crafton/api-client'
import { computed } from 'vue'

import {
	getProjectCardAllTags,
	getProjectCardTags,
	getProjectPagePath,
	type ProjectLinkMode,
} from '#ui/utils/v3-projects'

import ProjectCard from './card/ProjectCard.vue'
import ProjectCardList from './ProjectCardList.vue'

const props = withDefaults(
	defineProps<{
		projects: ContentApi.Projects.v3.Project[]
		layout?: 'list' | 'grid' | 'gallery'
		linkMode?: ProjectLinkMode
		showStatus?: boolean | ((project: ContentApi.Projects.v3.Project) => boolean)
	}>(),
	{
		layout: 'list',
		linkMode: 'website',
		showStatus: false,
	},
)

defineSlots<{
	actions?: (props: { project: ContentApi.Projects.v3.Project }) => unknown
}>()

const cardLayout = computed(() => (props.layout === 'list' ? 'list' : 'grid'))

function statusFor(project: ContentApi.Projects.v3.Project) {
	const visible =
		typeof props.showStatus === 'function' ? props.showStatus(project) : !!props.showStatus
	return visible ? project.status : undefined
}
</script>
