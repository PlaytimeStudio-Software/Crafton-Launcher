<template>
	<Admonition type="warning" inline-actions :header="formatMessage(messages.title)">
		{{ formatMessage(messages.text) }}
		<template #actions>
			<Button type="colored" color="orange" size="lg" @click="emit('delete')">
				<TrashIcon aria-hidden="true" />
				{{ formatMessage(messages.deleteInstance) }}
			</Button>
		</template>
	</Admonition>
</template>

<script setup lang="ts">
import { TrashIcon } from '@crafton/assets'
import { Admonition, Button, defineMessages, useVIntl } from '@crafton/ui'

const emit = defineEmits<{
	delete: []
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: {
		id: 'instance.locked.title',
		defaultMessage: 'Instance locked',
	},
	text: {
		id: 'instance.locked.text',
		defaultMessage: 'This instance is locked and cannot be played.',
	},
	deleteInstance: {
		id: 'instance.locked.delete-button',
		defaultMessage: 'Delete instance',
	},
})
</script>
