import type { ContentApi } from '@crafton/api-client'
import { getPrimaryProjectType } from '@crafton/utils'

import { normalizeProjectType } from './common-messages'
import { sortProjectTypes } from './project-types'

export type ProjectLinkMode = 'website' | 'app'

export function isProjectServer(project: ContentApi.Projects.v3.Project): boolean {
	return project.minecraft_server != null
}

export function getProjectCardTags(project: ContentApi.Projects.v3.Project): string[] {
	if (isProjectServer(project)) {
		return project.categories
	}
	return [...project.categories, ...project.loaders, ...(project.mrpack_loaders ?? [])]
}

export function getProjectCardAllTags(project: ContentApi.Projects.v3.Project): string[] {
	return [...getProjectCardTags(project), ...project.additional_categories]
}

export function getProjectPagePath(
	project: ContentApi.Projects.v3.Project,
	linkMode: ProjectLinkMode = 'website',
): string {
	if (linkMode === 'app') {
		return `/project/${project.id}`
	}
	if (isProjectServer(project)) {
		return `/server/${project.slug || project.id}`
	}
	return `/${getPrimaryProjectType(project)}/${project.slug || project.id}`
}

export function catalogProjectTypes(projects: ContentApi.Projects.v3.Project[]): string[] {
	const types = new Set(projects.map((project) => getPrimaryProjectType(project)))
	types.delete('project')
	return sortProjectTypes(types)
}

export function parseProjectTypeRouteParam(param: unknown): string | null {
	if (param == null) {
		return null
	}
	const type = Array.isArray(param) ? param[0] : param
	if (typeof type !== 'string' || type.length === 0) {
		return null
	}
	if (type === 'collection' || type === 'collections') {
		return 'collection'
	}
	const singular = type.endsWith('s') ? type.slice(0, -1) : type
	return normalizeProjectType(singular)
}

export function filterProjectsByType(
	projects: ContentApi.Projects.v3.Project[],
	projectType: string | null,
): ContentApi.Projects.v3.Project[] {
	if (!projectType) {
		return projects
	}
	return projects.filter((project) => getPrimaryProjectType(project) === projectType)
}
