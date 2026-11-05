import { AbstractModule } from '../../../core/abstract-module'
import type { ContentApi } from '../types'

export class ContentTagsV2Module extends AbstractModule {
	public getModuleID(): string {
		return 'content_tags_v2'
	}

	/** Get SPDX licenses available from the backend. */
	public async getLicenses(): Promise<ContentApi.Tags.v2.License[]> {
		return this.client.request<ContentApi.Tags.v2.License[]>('/tag/license', {
			api: 'content',
			version: 2,
			method: 'GET',
		})
	}

	/**
	 * Get license text by SPDX identifier
	 *
	 * @param licenseId - SPDX license identifier (e.g., 'MIT', 'Apache-2.0')
	 * @returns Promise resolving to the license title and body text
	 *
	 * @example
	 * ```typescript
	 * const license = await client.content.tags_v2.getLicenseText('MIT')
	 * console.log(license.title) // "MIT License"
	 * console.log(license.body)  // full license text
	 * ```
	 */
	public async getLicenseText(licenseId: string): Promise<ContentApi.Tags.v2.LicenseText> {
		return this.client.request<ContentApi.Tags.v2.LicenseText>(`/tag/license/${licenseId}`, {
			api: 'content',
			version: 2,
			method: 'GET',
		})
	}
}
