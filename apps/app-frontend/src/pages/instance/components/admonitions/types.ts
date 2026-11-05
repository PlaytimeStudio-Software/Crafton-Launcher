import type { StackedAdmonitionItem } from '@crafton/ui'

export type InstanceAdmonitionKind = 'instance-locked'

export type InstanceAdmonitionItem = StackedAdmonitionItem & {
	kind: InstanceAdmonitionKind
}
