const trimTrailingSlash = (url: string) => url.replace(/\/$/, '')

const contentApiBaseUrl = trimTrailingSlash(
	import.meta.env.CONTENT_API_BASE_URL || 'https://api.modrinth.com',
)

export const config = {
	contentApiBaseUrl,
}
