import { getHiddenInstanceIds } from '@/platform/app-lib/hidden-instances/commands'

export const hiddenInstanceKeys = {
	all: ['hidden-instances'] as const,
	ids: () => [...hiddenInstanceKeys.all] as const,
}

export const hiddenInstanceIdsQueryOptions = () => ({
	networkMode: 'always' as const,
	queryKey: hiddenInstanceKeys.ids(),
	queryFn: getHiddenInstanceIds,
	staleTime: Infinity,
})
