<template>
	<component
		:is="isLink ? RouterLink : 'button'"
		:to="isLink ? to : undefined"
		v-bind="$attrs"
		:disabled="isLink ? undefined : disabled"
		:active-class="isLink && isPrimary ? '' : undefined"
		:exact-active-class="isLink && isPrimary ? '' : undefined"
		:class="{
			'nav-item--active': isPrimary ? isPrimary(route) : undefined,
			'nav-item--subpage': isSubpage && isSubpage(route),
			disabled: disabled,
		}"
		class="nav-item"
		@click="onClick"
	>
		<img :src="icon" alt="" class="nav-item__icon" draggable="false" />
		<span class="nav-item__label">{{ label }}</span>
	</component>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { RouterLink, useRoute } from 'vue-router'

const route = useRoute()

type RouteFunction = (route: RouteLocationNormalizedLoaded) => boolean

const props = withDefaults(
	defineProps<{
		to: (() => void) | string
		icon: string
		label: string
		isPrimary?: RouteFunction
		isSubpage?: RouteFunction
		disabled?: boolean
	}>(),
	{
		disabled: false,
	},
)

const isLink = computed(() => typeof props.to === 'string')

function onClick() {
	if (typeof props.to === 'function') {
		props.to()
	}
}

defineOptions({
	inheritAttrs: false,
})
</script>

<style lang="scss" scoped>
.nav-item {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.75rem;
	width: 100%;
	height: 2.75rem;
	padding: 0 0.75rem;
	border: 1px solid transparent;
	border-radius: 0.75rem;
	background: transparent;
	color: var(--color-text-default);
	font-size: 1rem;
	font-weight: 600;
	text-align: left;
	cursor: pointer;
	transition:
		background-color 0.15s ease,
		border-color 0.15s ease,
		color 0.15s ease,
		box-shadow 0.15s ease;

	&:hover:not(.disabled) {
		background-color: var(--color-brand-highlight);
		color: var(--color-text-primary);
	}

	&.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
}

.nav-item__icon {
	width: 1.6rem;
	height: 1.6rem;
	flex-shrink: 0;
	image-rendering: auto;
}

.nav-item__label {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.nav-item--active,
.router-link-active:not(.nav-item--subpage),
.nav-item--subpage {
	color: var(--color-text-primary);
	border-color: var(--color-brand);
	background: linear-gradient(90deg, var(--color-brand-highlight) 0%, transparent 100%);
	box-shadow:
		0 0 0.75rem var(--color-brand-shadow),
		inset 0 0 0.5rem var(--color-brand-highlight);
}

.nav-item--subpage {
	box-shadow: none;
	border-color: var(--color-brand-highlight);
}

@media (max-width: 960px) {
	.nav-item {
		justify-content: center;
		padding: 0;
	}

	.nav-item__label {
		display: none;
	}
}
</style>
