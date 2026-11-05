import type { ContentApi } from '@crafton/api-client'
import type { Ref } from 'vue'

import { createContext } from './create-context'

export interface TagsContext {
	gameVersions: Ref<ContentApi.Tags.v2.GameVersion[]>
	loaders: Ref<ContentApi.Tags.v2.Loader[]>
}

export const [injectTags, provideTags] = createContext<TagsContext>('root', 'tags')
