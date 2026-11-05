type MarkdownUserCountryResolver = () => string | null | undefined

let resolveMarkdownUserCountry: MarkdownUserCountryResolver = () => undefined

export const setMarkdownUserCountryResolver = (resolver: MarkdownUserCountryResolver) => {
	resolveMarkdownUserCountry = resolver
}

export const getMarkdownUserCountry = () => resolveMarkdownUserCountry()
