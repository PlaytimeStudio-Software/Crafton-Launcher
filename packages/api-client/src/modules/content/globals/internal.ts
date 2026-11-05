import { AbstractModule } from '../../../core/abstract-module'
import type { ContentApi } from '../types'

export class ContentGlobalsInternalModule extends AbstractModule {
	public getModuleID(): string {
		return 'content_globals_internal'
	}

	/**
	 * Get configured global non-secret variables for this backend instance
	 *
	 * @returns Promise resolving to the global configuration
	 */
	public async get(): Promise<ContentApi.Globals.Internal.Globals> {
		return this.client.request<ContentApi.Globals.Internal.Globals>(`/globals`, {
			api: 'content',
			version: 'internal',
			method: 'GET',
			skipAuth: true,
		})
	}
}
