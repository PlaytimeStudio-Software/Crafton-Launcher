import { buildLocaleMessages, createMessageCompiler } from '@crafton/ui'
import englishUi from '@crafton/ui/src/locales/en-US/index.json'
import { createI18n } from 'vue-i18n'

import englishApp from './locales/en-US/index.json'

const i18n = createI18n({
	legacy: false,
	locale: 'en-US',
	fallbackLocale: 'en-US',
	messageCompiler: createMessageCompiler(),
	missingWarn: false,
	fallbackWarn: false,
	messages: buildLocaleMessages({
		'./app/en-US/index.json': { default: englishApp },
		'./ui/en-US/index.json': { default: englishUi },
	}),
})

export default i18n
