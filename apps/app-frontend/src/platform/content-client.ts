import { TauriContentClient, VerboseLoggingFeature } from '@crafton/api-client'
import { getVersion } from '@tauri-apps/api/app'

import { config } from '@/config'
import { createLocalFileUploader } from '@/platform/adapters/local-file-upload'

export function createAppClient(): TauriContentClient {
	const appVersion = getVersion()

	return new TauriContentClient({
		userAgent: async () => `crafton-launcher/${await appVersion}`,
		contentBaseUrl: config.contentApiBaseUrl,
		localFileUploader: createLocalFileUploader(),
		features: [new VerboseLoggingFeature()],
	})
}
