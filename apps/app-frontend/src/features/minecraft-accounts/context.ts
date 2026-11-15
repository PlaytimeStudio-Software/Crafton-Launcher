import { createContext } from '@crafton/ui'
import type { Ref } from 'vue'

import type { Skin } from '@/helpers/skins'

export interface MinecraftAccountsActions {
	readonly loginDisabled: boolean
	refreshValues: () => Promise<void>
	setEquippedSkin: (skin: Skin) => Promise<void>
	setLoginDisabled: (disabled: boolean) => void
	login: () => Promise<void>
	/** Head of the selected account's skin (Steve when nobody is signed in). */
	readonly avatarUrl: string
	readonly accountName: string | null
}

export const [injectMinecraftAccounts, provideMinecraftAccounts] = createContext<
	Readonly<Ref<MinecraftAccountsActions | null>>
>('root', 'minecraftAccounts')
