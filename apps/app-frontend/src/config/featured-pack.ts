export interface FeaturedPack {
	/** Stable id, used for what is remembered on this computer (installed version, access key). */
	id: string
	/** Shown until the release name is known. */
	name: string
	/** GitHub repository whose latest release carries the .mrpack. */
	repo: string
	/** True for a private repository: the player enters an access key once. */
	requiresKey?: boolean
}

export const FEATURED_PACKS: FeaturedPack[] = [
	{
		id: 'workshop-smp-26',
		name: 'Workshop SMP 26.3',
		repo: 'PlaytimeStudio-Software/Workshop-SMP-26',
		requiresKey: true,
	},
	{
		id: 'workshop-smp',
		name: 'Workshop SMP',
		repo: 'PlaytimeStudio-Software/Workshop-SMP',
	},
]
