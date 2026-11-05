import type { AbstractContentClient } from './abstract-client'

export abstract class AbstractModule {
	protected client: AbstractContentClient

	public constructor(client: AbstractContentClient) {
		this.client = client
	}

	/**
	 * Get the module's name, used for error reporting & for module field generation.
	 * @returns Module name
	 */
	public abstract getModuleID(): string
}
