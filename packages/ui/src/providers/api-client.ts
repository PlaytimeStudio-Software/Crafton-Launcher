import type { AbstractContentClient } from '@crafton/api-client'

import { createContext } from './create-context'

export const [injectContentClient, provideContentClient] = createContext<AbstractContentClient>(
	'root',
	'contentClient',
)
