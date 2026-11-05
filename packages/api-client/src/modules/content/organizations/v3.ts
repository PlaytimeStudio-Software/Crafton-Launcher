import { AbstractModule } from '../../../core/abstract-module'
import type { ContentApi } from '../types'

export class ContentOrganizationsV3Module extends AbstractModule {
	public getModuleID(): string {
		return 'content_organizations_v3'
	}

	/**
	 * Get an organization by ID or slug
	 *
	 * @param idOrSlug - Organization ID or slug
	 * @returns Promise resolving to the organization data
	 *
	 * @example
	 * ```typescript
	 * const org = await client.content.organizations_v3.get('my-org')
	 * ```
	 */
	public async get(idOrSlug: string): Promise<ContentApi.Organizations.v3.Organization> {
		return this.client.request<ContentApi.Organizations.v3.Organization>(
			`/organization/${idOrSlug}`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Get an organization's projects
	 *
	 * @param idOrSlug - Organization ID or slug
	 * @returns Promise resolving to the organization's projects
	 *
	 * @example
	 * ```typescript
	 * const projects = await client.content.organizations_v3.getProjects('my-org')
	 * ```
	 */
	public async getProjects(idOrSlug: string): Promise<ContentApi.Projects.v3.Project[]> {
		return this.client.request<ContentApi.Projects.v3.Project[]>(
			`/organization/${idOrSlug}/projects`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Get multiple organizations by their IDs
	 *
	 * @param ids - Array of organization IDs
	 * @returns Promise resolving to an array of organizations
	 *
	 * @example
	 * ```typescript
	 * const orgs = await client.content.organizations_v3.getMultiple(['id1', 'id2'])
	 * ```
	 */
	public async getMultiple(ids: string[]): Promise<ContentApi.Organizations.v3.Organization[]> {
		return this.client.request<ContentApi.Organizations.v3.Organization[]>(
			`/organizations?ids=${encodeURIComponent(JSON.stringify(ids))}`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Add a project to an organization
	 *
	 * @param idOrSlug - Organization ID or slug
	 * @param request - The project to add
	 *
	 * @example
	 * ```typescript
	 * await client.content.organizations_v3.addProject('my-org', { project_id: 'AABBCCDD' })
	 * ```
	 */
	public async addProject(
		idOrSlug: string,
		request: ContentApi.Organizations.v3.AddProjectRequest,
	): Promise<void> {
		return this.client.request(`/organization/${idOrSlug}/projects`, {
			api: 'content',
			version: 3,
			method: 'POST',
			body: request,
		})
	}

	/**
	 * Remove a project from an organization
	 *
	 * @param idOrSlug - Organization ID or slug
	 * @param projectId - Project ID to remove
	 * @param data - Request body containing the new_owner user ID
	 *
	 * @example
	 * ```typescript
	 * await client.content.organizations_v3.removeProject('my-org', 'proj123', { new_owner: 'user456' })
	 * ```
	 */
	public async removeProject(
		idOrSlug: string,
		projectId: string,
		data: ContentApi.Organizations.v3.RemoveProjectRequest,
	): Promise<void> {
		return this.client.request(`/organization/${idOrSlug}/projects/${projectId}`, {
			api: 'content',
			version: 3,
			method: 'DELETE',
			body: data,
		})
	}
}
