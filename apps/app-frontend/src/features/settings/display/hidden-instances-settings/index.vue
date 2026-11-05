<script setup lang="ts">
import { defineMessages, useVIntl } from '@crafton/ui'

import { useHiddenLibraryInstances } from '@/features/library/hidden-instances/use-hidden-library-instances'

import HiddenInstalledInstanceRow from './installed-row.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: {
		id: 'app.behavior-settings.hidden-instances.title',
		defaultMessage: 'Hidden instances',
	},
	description: {
		id: 'app.behavior-settings.hidden-instances.description',
		defaultMessage: "Instances you've hidden from your library on this device.",
	},
	empty: {
		id: 'app.behavior-settings.hidden-instances.empty',
		defaultMessage: "You haven't hidden any instances yet.",
	},
})

const hiddenInstances = useHiddenLibraryInstances()
</script>

<template>
	<section class="mt-8 border-0 border-t border-solid border-divider pt-6">
		<h2 class="m-0 text-xl font-semibold text-contrast">
			{{ formatMessage(messages.title) }}
		</h2>
		<p class="m-0 mt-1">{{ formatMessage(messages.description) }}</p>
		<div v-if="hiddenInstances.length > 0" class="mt-4 flex flex-col gap-2">
			<HiddenInstalledInstanceRow
				v-for="instance in hiddenInstances"
				:key="instance.id"
				:instance="instance"
			/>
		</div>
		<p v-else class="m-0 mx-auto mt-6 text-center text-sm text-secondary">
			{{ formatMessage(messages.empty) }}
		</p>
	</section>
</template>
