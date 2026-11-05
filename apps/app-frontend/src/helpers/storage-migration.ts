const RENAMED_STORAGE_KEYS: Record<string, string> = {
	'modrinth-theme': 'crafton-theme',
	'modrinth-preferred-dark-theme': 'crafton-preferred-dark-theme',
	'modrinth-quick-instance-count': 'crafton-quick-instance-count',
	'modrinth-jump-back-in-count': 'crafton-jump-back-in-count',
	'modrinth-app-update-prompt-state': 'crafton-app-update-prompt-state',
	'modrinth-advanced-exclusion-filters': 'crafton-advanced-exclusion-filters',
	'aero.featuredPack': 'crafton.featuredPack',
}

try {
	for (const [oldKey, newKey] of Object.entries(RENAMED_STORAGE_KEYS)) {
		const value = window.localStorage.getItem(oldKey)
		if (value === null) continue
		if (window.localStorage.getItem(newKey) === null) {
			window.localStorage.setItem(newKey, value)
		}
		window.localStorage.removeItem(oldKey)
	}
} catch {
	/* empty */
}
