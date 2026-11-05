<script setup lang="ts">
import craftonIcon from '@/assets/branding/crafton-logo.png'

defineProps<{
	iconOnly?: boolean
}>()
</script>

<template>
	<span class="inline-flex items-center gap-2">
		<img :src="craftonIcon" alt="" class="h-full w-auto shrink-0" draggable="false" />
		<span v-if="!iconOnly" class="whitespace-nowrap text-base font-bold leading-none">
			Crafton Launcher
		</span>
	</span>
</template>
