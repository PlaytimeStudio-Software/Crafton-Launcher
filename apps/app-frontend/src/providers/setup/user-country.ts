import { provideUserCountry } from '@crafton/ui'
import { ref } from 'vue'

export function setupUserCountryProvider() {
	return provideUserCountry(ref('US'))
}
