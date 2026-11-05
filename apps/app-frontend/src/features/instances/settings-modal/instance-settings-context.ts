import { createContext } from '@crafton/ui'
import type { ComputedRef } from 'vue'

import type { GameInstance } from '@/helpers/types'

export interface InstanceSettingsContext {
	instance: ComputedRef<GameInstance>
	offline?: boolean
	onUnlinked: () => void
	closeModal?: (onAfterClose?: () => void) => void
}

export const [injectInstanceSettings, provideInstanceSettings] =
	createContext<InstanceSettingsContext>('InstanceSettingsModal', 'instanceSettings')
