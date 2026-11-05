import { useQuery } from '@tanstack/vue-query'
import { computed } from 'vue'

import type { LibraryInstance } from '@/features/library/library-instance'
import { instanceListQueryOptions } from '@/pages/instance/query-options'

import { useHiddenInstances } from './use-hidden-instances'

export function useHiddenLibraryInstances() {
	const instancesQuery = useQuery(instanceListQueryOptions())
	const instances = computed(() => instancesQuery.data.value ?? [])
	const { hiddenIds } = useHiddenInstances()

	return computed(() => {
		const instancesById = new Map<string, LibraryInstance>(
			instances.value.map((instance) => [instance.id, instance]),
		)
		return [...hiddenIds.value].flatMap((instanceId) => {
			const instance = instancesById.get(instanceId)
			return instance ? [instance] : []
		})
	})
}
