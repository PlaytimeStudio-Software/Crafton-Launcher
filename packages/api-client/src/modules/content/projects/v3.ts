import { AbstractModule } from '../../../core/abstract-module'
import { ContentApiError } from '../../../core/errors'
import type { ContentApi } from '../types'

export class ContentProjectsV3Module extends AbstractModule {
	public getModuleID(): string {
		return 'content_projects_v3'
	}

	/**
	 * Get a project by ID or slug (v3)
	 *
	 * @param id - Project ID or slug (e.g., 'sodium' or 'AANobbMI')
	 * @returns Promise resolving to the v3 project data
	 *
	 * @example
	 * ```typescript
	 * const project = await client.content.projects_v3.get('sodium')
	 * console.log(project.project_types) // v3 field
	 * ```
	 */
	public async get(id: string): Promise<ContentApi.Projects.v3.Project> {
		return this.client.request<ContentApi.Projects.v3.Project>(`/project/${id}`, {
			api: 'content',
			version: 3,
			method: 'GET',
		})
	}

	public async validate(id: string): Promise<ContentApi.Projects.v3.ProjectValidationResponse> {
		return this.client.request<ContentApi.Projects.v3.ProjectValidationResponse>(
			`/project/${id}/validate`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Get a project's dependencies (v3)
	 *
	 * Returns all projects and versions that are dependencies of this project's versions.
	 *
	 * @param id - Project ID or slug
	 * @returns Promise resolving to dependency data with projects and versions
	 *
	 * @example
	 * ```typescript
	 * const deps = await client.content.projects_v3.getDependencies('sodium')
	 * console.log(deps.projects) // Array of project objects
	 * console.log(deps.versions) // Array of version objects
	 * ```
	 */
	public async getDependencies(id: string): Promise<ContentApi.Projects.v3.ProjectDependencies> {
		return this.client.request<ContentApi.Projects.v3.ProjectDependencies>(
			`/project/${id}/dependencies`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Get multiple projects by IDs (v3)
	 *
	 * @param ids - Array of project IDs or slugs
	 * @returns Promise resolving to array of v3 projects
	 *
	 * @example
	 * ```typescript
	 * const projects = await client.content.projects_v3.getMultiple(['sodium', 'lithium'])
	 * ```
	 */
	public async getMultiple(ids: string[]): Promise<ContentApi.Projects.v3.Project[]> {
		return this.client.request<ContentApi.Projects.v3.Project[]>(`/projects`, {
			api: 'content',
			version: 3,
			method: 'GET',
			params: { ids: JSON.stringify(ids) },
		})
	}

	/**
	 * Search projects (v3)
	 *
	 * @param params - Search parameters
	 * @returns Promise resolving to v3 search results
	 */
	public async search(
		params: ContentApi.Search.SearchParams,
		options?: {
			headers?: Record<string, string>
		},
	): Promise<ContentApi.Search.v3.SearchResults> {
		return this.client.request<ContentApi.Search.v3.SearchResults>(`/search`, {
			api: 'content',
			version: 3,
			method: 'GET',
			headers: options?.headers,
			params: {
				...params,
				facets: params.facets ? JSON.stringify(params.facets) : undefined,
			},
		})
	}

	/**
	 * Edit a project (v3)
	 *
	 * @param id - Project ID or slug
	 * @param data - Project update data (v3 fields)
	 *
	 * @example
	 * ```typescript
	 * await client.content.projects_v3.edit('sodium', {
	 *   environment: 'client_and_server'
	 * })
	 * ```
	 */
	public async edit(id: string, data: ContentApi.Projects.v3.EditProjectRequest): Promise<void> {
		return this.client.request(`/project/${id}`, {
			api: 'content',
			version: 3,
			method: 'PATCH',
			body: data,
		})
	}

	/**
	 * Get the organization that owns a project
	 *
	 * @param id - Project ID or slug
	 * @returns Promise resolving to the organization data, or null if the project is not owned by an organization
	 */
	public async getOrganization(id: string): Promise<ContentApi.Projects.v3.Organization | null> {
		try {
			return await this.client.request<ContentApi.Projects.v3.Organization>(
				`/project/${id}/organization`,
				{ api: 'content', version: 3, method: 'GET' },
			)
		} catch (error) {
			// 404 means the project is not owned by an organization
			if (error instanceof ContentApiError && error.statusCode === 404) {
				return null
			}
			throw error
		}
	}

	/**
	 * Get the team members of a project
	 *
	 * @param id - Project ID or slug
	 * @returns Promise resolving to an array of team members
	 */
	public async getMembers(id: string): Promise<ContentApi.Projects.v3.TeamMember[]> {
		return this.client.request<ContentApi.Projects.v3.TeamMember[]>(`/project/${id}/members`, {
			api: 'content',
			version: 3,
			method: 'GET',
		})
	}

	public async createServerProject(
		data: ContentApi.Projects.v3.CreateServerProjectRequest,
	): Promise<ContentApi.Projects.v3.Project> {
		return this.client.request<ContentApi.Projects.v3.Project>(`/project`, {
			api: 'content',
			version: 3,
			method: 'PUT',
			body: data,
		})
	}

	/**
	 * Delete a project
	 *
	 * @param id - Project ID or slug
	 *
	 * @example
	 * ```typescript
	 * await client.content.projects_v3.deleteProject('my-project')
	 * ```
	 */
	public async deleteProject(id: string): Promise<void> {
		return this.client.request(`/project/${id}`, {
			api: 'content',
			version: 3,
			method: 'DELETE',
		})
	}

	/**
	 * Change the icon of a project
	 *
	 * @param id - Project ID or slug
	 * @param file - Image file to upload
	 * @param ext - File extension (e.g., 'png', 'jpeg', 'gif', 'webp')
	 *
	 * @example
	 * ```typescript
	 * await client.content.projects_v3.changeIcon('sodium', imageFile, 'png')
	 * ```
	 */
	public async changeIcon(id: string, file: Blob, ext: string): Promise<void> {
		return this.client.request(`/project/${id}/icon`, {
			api: 'content',
			version: 3,
			method: 'PATCH',
			params: { ext },
			body: file,
		})
	}

	/**
	 * Delete the icon of a project
	 *
	 * @param id - Project ID or slug
	 *
	 * @example
	 * ```typescript
	 * await client.content.projects_v3.deleteIcon('sodium')
	 * ```
	 */
	public async deleteIcon(id: string): Promise<void> {
		return this.client.request(`/project/${id}/icon`, {
			api: 'content',
			version: 3,
			method: 'DELETE',
		})
	}

	/**
	 * Create a gallery image for a project
	 *
	 * @param id - Project ID or slug
	 * @param file - Image file to upload
	 * @param options - Gallery image options
	 *
	 * @example
	 * ```typescript
	 * await client.content.projects_v3.createGalleryImage('sodium', imageFile, {
	 *   featured: true,
	 *   name: 'Screenshot 1',
	 *   description: 'Main menu with Sodium enabled'
	 * })
	 * ```
	 */
	public async createGalleryImage(
		id: string,
		file: Blob,
		options: {
			ext: string
			featured: boolean
			name?: string
			description?: string
			ordering?: number
		},
	): Promise<void> {
		const params: Record<string, string> = {
			ext: options.ext,
			featured: String(options.featured),
		}
		if (options.name) params.name = options.name
		if (options.description) params.description = options.description
		if (options.ordering !== undefined) params.ordering = String(options.ordering)

		return this.client.request(`/project/${id}/gallery`, {
			api: 'content',
			version: 3,
			method: 'POST',
			params,
			body: file,
		})
	}

	/**
	 * Delete a gallery image
	 *
	 * @param url - URL of the gallery image to delete
	 *
	 * @example
	 * ```typescript
	 * await client.content.projects_v3.deleteGalleryImage('https://cdn.modrinth.com/...')
	 * ```
	 */
	public async deleteGalleryImage(url: string): Promise<void> {
		return this.client.request('/project-gallery', {
			api: 'content',
			version: 3,
			method: 'DELETE',
			params: { url },
		})
	}

	/**
	 * Get content disclosures for a project
	 *
	 * @param id - Project ID or slug
	 * @returns Promise resolving to the project's disclosures
	 *
	 * @example
	 * ```typescript
	 * const { disclosures } = await client.content.projects_v3.getDisclosures('sodium')
	 * ```
	 */
	public async getDisclosures(id: string): Promise<ContentApi.Projects.v3.GetProjectDisclosures> {
		return this.client.request<ContentApi.Projects.v3.GetProjectDisclosures>(
			`/project/${id}/disclosures`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Modify content disclosures for a project
	 *
	 * @param id - Project ID or slug
	 * @param data - Disclosures to set and types to remove
	 *
	 * @example
	 * ```typescript
	 * await client.content.projects_v3.modifyDisclosures('sodium', {
	 *   set: [{ type: 'ai_content', uses: ['text'], note: 'Translations are AI-generated.' }],
	 *   remove: ['advertisements'],
	 * })
	 * ```
	 */
	public async modifyDisclosures(
		id: string,
		data: ContentApi.Projects.v3.ModifyProjectDisclosures,
	): Promise<void> {
		return this.client.request(`/project/${id}/disclosures`, {
			api: 'content',
			version: 3,
			method: 'PATCH',
			body: data,
		})
	}
}
