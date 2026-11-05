import type { ContentApi } from '@crafton/api-client'
import { createContext } from '@crafton/ui'
import type { ComputedRef, Ref } from 'vue'

import type { GameInstance } from '@/helpers/types'

export interface InstancePageContext {
	readonly instanceId: ComputedRef<string>
	readonly instance: ComputedRef<GameInstance>
	readonly linkedProject: ComputedRef<ContentApi.Projects.v3.Project | undefined>
	readonly offline: Readonly<Ref<boolean>>
	readonly playing: ComputedRef<boolean>
	readonly loading: Readonly<Ref<boolean>>
	readonly stopping: Readonly<Ref<boolean>>
	refreshInstance: () => Promise<void>
	refreshPlayState: () => Promise<void>
	play: (source: string) => Promise<void>
	stop: (source: string) => Promise<void>
	openSettings: (tab?: number) => void
	browseContent: (projectType?: string) => Promise<void>
}

export const [injectInstancePage, provideInstancePage] =
	createContext<InstancePageContext>('InstancePage')
