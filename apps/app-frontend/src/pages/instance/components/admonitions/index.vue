<template>
	<StackedAdmonitions v-bind="$attrs" :items="stackItems" class="w-full">
		<template #item="{ item }">
			<InstanceAdmonitionsInstanceLocked
				v-if="item.kind === 'instance-locked'"
				@delete="emit('delete')"
			/>
		</template>
	</StackedAdmonitions>
</template>

<script setup lang="ts">
import { StackedAdmonitions } from '@crafton/ui'
import { computed } from 'vue'

import type { GameInstance } from '@/helpers/types'

import InstanceAdmonitionsInstanceLocked from './instance-locked.vue'
import type { InstanceAdmonitionItem } from './types.ts'

defineOptions({
	inheritAttrs: false,
})

const props = defineProps<{
	instance: GameInstance
}>()

const emit = defineEmits<{
	delete: []
}>()

const stackItems = computed<InstanceAdmonitionItem[]>(() =>
	props.instance.quarantined
		? [
				{
					id: 'instance-locked',
					type: 'warning',
					dismissible: false,
					kind: 'instance-locked',
				},
			]
		: [],
)
</script>
