<script setup lang="ts">
import { defineMessages, useVIntl } from '@crafton/ui'
import { onActivated } from 'vue'

import screenshotsIcon from '@/assets/redesign/icon-screenshots.webp'
import ScreenshotsPage from '@/components/ui/screenshots-page/index.vue'
import { useRootBreadcrumb } from '@/shared/breadcrumbs'

defineOptions({ name: 'ScreenshotsPage' })

const { formatMessage } = useVIntl()
const messages = defineMessages({
	screenshots: { id: 'app.screenshots.heading', defaultMessage: 'Screenshots' },
})
const breadcrumb = useRootBreadcrumb({
	slot: 'root',
	id: 'screenshots',
	label: formatMessage(messages.screenshots),
	to: '/screenshots',
	visual: { type: 'image', src: screenshotsIcon, alt: '' },
})
onActivated(breadcrumb.reset)
</script>

<template>
	<div class="box-border h-full p-6">
		<ScreenshotsPage show-heading />
	</div>
</template>
