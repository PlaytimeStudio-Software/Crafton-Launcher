import { I18N_INJECTION_KEY, type I18nContext } from '@crafton/ui'
import type { App } from 'vue'

import i18n from '@/i18n.config'

export default {
	install(app: App) {
		app.use(i18n)

		const context: I18nContext = {
			locale: i18n.global.locale,
			t: (key, values) => i18n.global.t(key, values ?? {}) as string,
			setLocale: () => {},
		}

		app.provide(I18N_INJECTION_KEY, context)
	},
}
