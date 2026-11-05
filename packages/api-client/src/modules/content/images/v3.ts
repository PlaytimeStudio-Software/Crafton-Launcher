import { AbstractModule } from '../../../core/abstract-module'
import type { UploadHandle } from '../../../types/upload'
import type { ContentApi } from '../types'

function buildImageQueryParams(
	ext: ContentApi.Images.v3.ImageExtension,
	target: ContentApi.Images.v3.UploadImageParams,
): Record<string, string> {
	const params: Record<string, string> = {
		ext,
		context: target.context,
	}
	switch (target.context) {
		case 'project':
			params.project_id = target.project_id
			break
		case 'version':
			params.version_id = target.version_id
			break
		case 'thread_message':
			params.thread_message_id = target.thread_message_id
			break
		case 'report':
			if (target.report_id) params.report_id = target.report_id
			break
	}
	return params
}

export class ContentImagesV3Module extends AbstractModule {
	public getModuleID(): string {
		return 'content_images_v3'
	}

	public uploadImage(
		file: File | Blob,
		ext: ContentApi.Images.v3.ImageExtension,
		target: ContentApi.Images.v3.UploadImageParams,
	): UploadHandle<ContentApi.Images.v3.UploadedImage> {
		return this.client.upload<ContentApi.Images.v3.UploadedImage>('/image', {
			api: 'content',
			version: 3,
			file,
			params: buildImageQueryParams(ext, target),
		})
	}
}
