import type { ContentApi } from '@crafton/api-client'

export type UpdateAllVersion = Pick<ContentApi.Versions.v2.Version, 'id' | 'version_number'> &
	Partial<Pick<ContentApi.Versions.v2.Version, 'version_type' | 'changelog'>>

export interface UpdateAllItem {
	id: string
	project: Pick<ContentApi.Projects.v2.Project, 'id' | 'title' | 'icon_url'>
	currentVersion: Pick<ContentApi.Versions.v2.Version, 'id' | 'version_number'>
	/** Compatible update candidates, in preferred order. */
	versions: UpdateAllVersion[]
	initialVersionId?: string
	initiallySelected?: boolean
}

export interface UpdateAllSelection {
	id: string
	projectId: string
	version: UpdateAllVersion
}
