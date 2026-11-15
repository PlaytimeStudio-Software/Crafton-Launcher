import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

const STORAGE_KEY = 'crafton-account-panel-hidden'

function loadHidden(): boolean {
	try {
		return window.localStorage.getItem(STORAGE_KEY) === 'true'
	} catch {
		return false
	}
}

const hidden = ref(loadHidden())

watch(hidden, (value) => {
	try {
		window.localStorage.setItem(STORAGE_KEY, String(value))
	} catch {
		// storage blocked or full
	}
})

/**
 * The account panel on the right. The player can hide it with the button next to "Playing as" and
 * bring it back with their skin head in the top bar. Browse and project pages always show it,
 * because they put their filters there.
 */
export function useAccountPanel() {
	const route = useRoute()
	const forced = computed(
		() => route.path.startsWith('/browse') || route.path.startsWith('/project'),
	)
	const visible = computed(() => forced.value || !hidden.value)
	const canHide = computed(() => !forced.value)

	return {
		visible,
		canHide,
		/** True when the panel is hidden and the top bar should offer to show it again. */
		showReopen: computed(() => !visible.value),
		hide: () => {
			hidden.value = true
		},
		show: () => {
			hidden.value = false
		},
	}
}
