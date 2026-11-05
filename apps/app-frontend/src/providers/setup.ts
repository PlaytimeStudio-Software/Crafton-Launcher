import type { AbstractContentClient, IconConfig } from '@crafton/api-client'
import type { AbstractPopupNotificationManager, AbstractWebNotificationManager } from '@crafton/ui'

import { setupInstanceActionsProvider } from '@/features/instances/instance-actions/context'

import type { AppEvents } from './app-events'
import { setupOnboardingChecklistProvider } from './onboarding-checklist'
import { setupCreationModal } from './setup/creation-modal'
import { setupFileDropProvider } from './setup/file-drop'
import { setupFilePickerProvider } from './setup/file-picker'
import { setupImageViewerEditorProvider } from './setup/image-viewer-editor'
import { setupInstanceImportProvider } from './setup/instance-import'
import { setupTagsProvider } from './setup/tags'
import { setupUserCountryProvider } from './setup/user-country'

export function setupProviders(
	client: AbstractContentClient,
	notificationManager: AbstractWebNotificationManager,
	_popupNotificationManager: AbstractPopupNotificationManager,
	appEvents: AppEvents,
	getGeneratedIconConfig?: (iconPath: string) => IconConfig | null,
) {
	setupUserCountryProvider()
	const tags = setupTagsProvider(notificationManager)
	setupFileDropProvider()
	setupFilePickerProvider()
	setupImageViewerEditorProvider()
	setupInstanceImportProvider(notificationManager)
	const onboardingChecklist = setupOnboardingChecklistProvider(appEvents)
	setupInstanceActionsProvider()

	return {
		...setupCreationModal(notificationManager, getGeneratedIconConfig),
		onboardingChecklist,
		tags,
	}
}
