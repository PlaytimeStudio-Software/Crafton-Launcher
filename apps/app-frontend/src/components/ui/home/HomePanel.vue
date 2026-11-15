<script setup lang="ts">
defineProps<{
	title: string
	icon?: string
}>()
</script>

<template>
	<section class="home-panel">
		<header class="home-panel__header">
			<div class="home-panel__sign">
				<img v-if="icon" :src="icon" alt="" class="home-panel__icon" draggable="false" />
				<h2 class="home-panel__title">{{ title }}</h2>
			</div>
			<div class="home-panel__actions">
				<slot name="actions" />
			</div>
		</header>
		<div class="home-panel__body">
			<slot />
		</div>
	</section>
</template>

<style scoped lang="scss">
.home-panel {
	display: flex;
	flex-direction: column;
	min-width: 0;
	border-radius: var(--radius-xl);
	border: 1px solid var(--surface-4);
	background: linear-gradient(180deg, var(--surface-2-5) 0%, var(--surface-2) 100%);
	box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.25);
}

.home-panel__header {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.75rem 1rem 0;
}

/* A bronze-trimmed plate, like a wooden sign hung over the panel. */
.home-panel__sign {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.35rem 1rem 0.35rem 0.6rem;
	border-radius: 0.6rem;
	border: 1px solid color-mix(in srgb, var(--color-bronze, #c98a4b) 70%, transparent);
	background: linear-gradient(
		180deg,
		color-mix(in srgb, var(--color-bronze, #c98a4b) 28%, var(--surface-3)) 0%,
		color-mix(in srgb, var(--color-bronze, #c98a4b) 12%, var(--surface-2)) 100%
	);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.08),
		0 0.25rem 0.75rem rgba(0, 0, 0, 0.35);
}

.home-panel__icon {
	width: 1.5rem;
	height: 1.5rem;
}

.home-panel__title {
	margin: 0;
	font-size: 1.15rem;
	font-weight: 800;
	letter-spacing: 0.01em;
	color: #ffe2b8;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.home-panel__actions {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.home-panel__body {
	padding: 0.75rem 1rem 1rem;
	min-width: 0;
}
</style>
