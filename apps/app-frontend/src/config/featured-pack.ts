export interface FeaturedPack {
	/** Stable id, used for what is remembered on this computer (installed version, access key). */
	id: string
	/** Shown until the release name is known. */
	name: string
	/** GitHub repository whose latest release carries the .mrpack. */
	repo: string
	/** True for a private repository: the player signs in with GitHub or enters an access key once. */
	requiresKey?: boolean
	/**
	 * Client ID of the launcher's GitHub App (public, not a secret). When set, the card offers
	 * "Sign in with GitHub"; when empty, only the access key box is shown.
	 */
	githubAppClientId?: string
}

export const FEATURED_PACKS: FeaturedPack[] = [
	{
		id: 'workshop-smp-26',
		name: 'Workshop SMP 26.3',
		repo: 'PlaytimeStudio-Software/Workshop-SMP-26',
		requiresKey: true,
		githubAppClientId: 'Iv23li4SA7tXgHav2Uz8',
	},
	{
		id: 'workshop-smp',
		name: 'Workshop SMP',
		repo: 'PlaytimeStudio-Software/Workshop-SMP',
	},
]
