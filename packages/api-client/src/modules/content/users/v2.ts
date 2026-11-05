import { AbstractModule } from '../../../core/abstract-module'
import type { ContentApi } from '../types'

export class ContentUsersV2Module extends AbstractModule {
	public getModuleID(): string {
		return 'content_users_v2'
	}

	/**
	 * Get a user by ID or username
	 *
	 * @param idOrUsername - The user's ID or username
	 * @returns Promise resolving to the user data
	 *
	 * @example
	 * ```typescript
	 * const user = await client.content.users_v2.get('my_user')
	 * ```
	 */
	public async get(idOrUsername: string): Promise<ContentApi.Users.v2.User> {
		return this.client.request<ContentApi.Users.v2.User>(`/user/${idOrUsername}`, {
			api: 'content',
			version: 2,
			method: 'GET',
		})
	}

	/**
	 * Get multiple users by their IDs
	 *
	 * @param ids - Array of user IDs
	 * @returns Promise resolving to an array of users
	 *
	 * @example
	 * ```typescript
	 * const users = await client.content.users_v2.getMultiple(['id1', 'id2'])
	 * ```
	 */
	public async getMultiple(ids: string[]): Promise<ContentApi.Users.v2.User[]> {
		return this.client.request<ContentApi.Users.v2.User[]>(
			`/users?ids=${encodeURIComponent(JSON.stringify(ids))}`,
			{
				api: 'content',
				version: 2,
				method: 'GET',
			},
		)
	}

	/**
	 * Get a user's projects
	 *
	 * @param idOrUsername - The user's ID or username
	 * @returns Promise resolving to an array of the user's projects
	 *
	 * @example
	 * ```typescript
	 * const projects = await client.content.users_v2.getProjects('my_user')
	 * ```
	 */
	public async getProjects(idOrUsername: string): Promise<ContentApi.Projects.v2.Project[]> {
		return this.client.request<ContentApi.Projects.v2.Project[]>(`/user/${idOrUsername}/projects`, {
			api: 'content',
			version: 2,
			method: 'GET',
		})
	}

	/**
	 * Get a user's organizations
	 *
	 * @param idOrUsername - The user's ID or username
	 * @returns Promise resolving to an array of the user's organizations
	 *
	 * @example
	 * ```typescript
	 * const orgs = await client.content.users_v2.getOrganizations('my_user')
	 * ```
	 */
	public async getOrganizations(
		idOrUsername: string,
	): Promise<ContentApi.Organizations.v3.Organization[]> {
		return this.client.request<ContentApi.Organizations.v3.Organization[]>(
			`/user/${idOrUsername}/organizations`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Get a user's collections
	 *
	 * @param idOrUsername - The user's ID or username
	 * @returns Promise resolving to an array of the user's collections
	 *
	 * @example
	 * ```typescript
	 * const collections = await client.content.users_v2.getCollections('my_user')
	 * ```
	 */
	public async getCollections(idOrUsername: string): Promise<ContentApi.Collections.Collection[]> {
		return this.client.request<ContentApi.Collections.Collection[]>(
			`/user/${idOrUsername}/collections`,
			{
				api: 'content',
				version: 3,
				method: 'GET',
			},
		)
	}

	/**
	 * Get a user's notifications
	 *
	 * @param idOrUsername - The user's ID or username
	 * @returns Promise resolving to an array of the user's notifications
	 *
	 * @example
	 * ```typescript
	 * const notifications = await client.content.users_v2.getNotifications('my_user')
	 * ```
	 */
	public async getNotifications(
		idOrUsername: string,
	): Promise<ContentApi.Notifications.v2.Notification[]> {
		return this.client.request<ContentApi.Notifications.v2.Notification[]>(
			`/user/${idOrUsername}/notifications`,
			{
				api: 'content',
				version: 2,
				method: 'GET',
			},
		)
	}

	/**
	 * Get projects a user follows
	 *
	 * @param idOrUsername - The user's ID or username
	 * @returns Promise resolving to an array of followed projects
	 *
	 * @example
	 * ```typescript
	 * const projects = await client.content.users_v2.getFollowedProjects('my_user')
	 * ```
	 */
	public async getFollowedProjects(
		idOrUsername: string,
	): Promise<ContentApi.Projects.v2.Project[]> {
		return this.client.request<ContentApi.Projects.v2.Project[]>(`/user/${idOrUsername}/follows`, {
			api: 'content',
			version: 2,
			method: 'GET',
		})
	}

	/**
	 * Update a user
	 *
	 * @param idOrUsername - The user's ID or username
	 * @param data - Fields to update
	 *
	 * @example
	 * ```typescript
	 * await client.content.users_v2.patch('my_user', { role: 'admin' })
	 * ```
	 */
	public async patch(
		idOrUsername: string,
		data: Partial<Pick<ContentApi.Users.v2.User, 'badges' | 'bio' | 'role' | 'username'>>,
	): Promise<void> {
		return this.client.request(`/user/${idOrUsername}`, {
			api: 'content',
			version: 2,
			method: 'PATCH',
			body: data,
		})
	}

	/**
	 * Change a user's avatar.
	 *
	 * @param idOrUsername - The user's ID or username
	 * @param file - Image file to upload
	 * @param ext - File extension (e.g., 'png', 'jpeg', 'gif', 'webp')
	 */
	public async changeIcon(idOrUsername: string, file: Blob, ext: string): Promise<void> {
		return this.client.request(`/user/${idOrUsername}/icon`, {
			api: 'content',
			version: 2,
			method: 'PATCH',
			params: { ext },
			body: file,
		})
	}

	/**
	 * Delete a user's avatar.
	 *
	 * @param idOrUsername - The user's ID or username
	 */
	public async deleteIcon(idOrUsername: string): Promise<void> {
		return this.client.request(`/user/${idOrUsername}/icon`, {
			api: 'content',
			version: 2,
			method: 'DELETE',
		})
	}
}
