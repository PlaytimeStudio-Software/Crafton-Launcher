import { AbstractModule } from '../../../core/abstract-module'
import type { ContentApi } from '../types'

export class ContentContentV3Module extends AbstractModule {
	public getModuleID(): string {
		return 'content_content_v3'
	}

	public async resolve(
		request: ContentApi.Content.v3.ResolveContentRequest,
	): Promise<ContentApi.Content.v3.ResolveContentPlan> {
		return this.client.request<ContentApi.Content.v3.ResolveContentPlan>('/content/resolve', {
			api: 'content',
			version: 3,
			method: 'POST',
			body: request,
		})
	}
}
