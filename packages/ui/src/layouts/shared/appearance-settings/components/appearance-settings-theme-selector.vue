<script setup lang="ts" generic="T extends string">
import { MoonIcon, RadioButtonCheckedIcon, RadioButtonIcon, SunIcon } from '@crafton/assets'

import deepslateBlock from '@crafton/assets/illustrations/themes/deepslate.webp'
import diamondBlock from '@crafton/assets/illustrations/themes/diamond.webp'
import enderBlock from '@crafton/assets/illustrations/themes/ender.webp'
import grassBlock from '@crafton/assets/illustrations/themes/grass-block.webp'
import lapisBlock from '@crafton/assets/illustrations/themes/lapis.webp'
import netheriteBlock from '@crafton/assets/illustrations/themes/netherite.webp'

import { defineMessages, useVIntl } from '#ui/composables/i18n'

const themeBlocks: Record<string, string> = {
	dark: diamondBlock,
	grass: grassBlock,
	ender: enderBlock,
	lapis: lapisBlock,
	netherite: netheriteBlock,
	deepslate: deepslateBlock,
}

const { formatMessage } = useVIntl()

const { ariaLabel, modelValue, themeOptions, systemThemeColor, preferredDarkTheme } = defineProps<{
	ariaLabel: string
	modelValue: T
	themeOptions: readonly T[]
	systemThemeColor: T
	preferredDarkTheme: T
}>()

const emit = defineEmits<{
	'update:modelValue': [theme: T]
}>()

const themeLabels = defineMessages({
	system: {
		id: 'settings.display.theme.system',
		defaultMessage: 'Sync with system',
	},
	light: {
		id: 'settings.display.theme.light',
		defaultMessage: 'Light',
	},
	dark: {
		id: 'settings.display.theme.dark',
		defaultMessage: 'Diamond',
	},
	grass: {
		id: 'settings.display.theme.grass',
		defaultMessage: 'Grass block',
	},
	ender: {
		id: 'settings.display.theme.ender',
		defaultMessage: 'Ender',
	},
	lapis: {
		id: 'settings.display.theme.lapis',
		defaultMessage: 'Lapis',
	},
	netherite: {
		id: 'settings.display.theme.netherite',
		defaultMessage: 'Netherite',
	},
	deepslate: {
		id: 'settings.display.theme.deepslate',
		defaultMessage: 'Deepslate',
	},
	oled: {
		id: 'settings.display.theme.oled',
		defaultMessage: 'OLED',
	},
	retro: {
		id: 'settings.display.theme.retro',
		defaultMessage: 'Retro',
	},
	skyline: {
		id: 'settings.display.theme.skyline',
		defaultMessage: 'Skyline',
	},
	aurora: {
		id: 'settings.display.theme.aurora',
		defaultMessage: 'Aurora',
	},
})

const themeTooltips = defineMessages({
	preferredLight: {
		id: 'settings.display.theme.preferred-light-theme',
		defaultMessage: 'Preferred light theme',
	},
	preferredDark: {
		id: 'settings.display.theme.preferred-dark-theme',
		defaultMessage: 'Preferred dark theme',
	},
})

function formatTheme(theme: T): string {
	const message = themeLabels[theme as keyof typeof themeLabels]
	return message ? formatMessage(message) : theme
}

function getPreviewClass(option: T): string {
	const base = option === 'system' ? systemThemeColor : option
	return base.endsWith('-mode') ? base : `${base}-mode`
}
</script>

<template>
	<div class="theme-options" role="group" :aria-label="ariaLabel">
		<button
			v-for="option in themeOptions"
			:key="option"
			type="button"
			class="preview-radio button-base"
			:class="{ selected: modelValue === option }"
			:aria-pressed="modelValue === option"
			@click="emit('update:modelValue', option)"
		>
			<div class="preview" :class="getPreviewClass(option)" aria-hidden="true">
				<div v-if="themeBlocks[option]" class="block-preview">
					<img :src="themeBlocks[option]" alt="" draggable="false" />
				</div>
				<div
					v-else
					class="example-card rounded-lg border border-solid border-surface-4 bg-surface-3"
				>
					<div class="example-icon"></div>
					<div class="example-text-1"></div>
					<div class="example-text-2"></div>
				</div>
			</div>
			<div class="label">
				<RadioButtonCheckedIcon
					v-if="modelValue === option"
					class="radio shrink-0"
					aria-hidden="true"
				/>
				<RadioButtonIcon v-else class="radio shrink-0" aria-hidden="true" />
				{{ formatTheme(option) }}
				<SunIcon
					v-if="'skyline' === option"
					v-tooltip="formatMessage(themeTooltips.preferredLight)"
					class="theme-icon shrink-0"
					aria-hidden="true"
				/>
				<MoonIcon
					v-else-if="option === preferredDarkTheme"
					v-tooltip="formatMessage(themeTooltips.preferredDark)"
					class="theme-icon shrink-0"
					aria-hidden="true"
				/>
			</div>
		</button>
	</div>
</template>

<style scoped lang="scss">
.theme-options {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
	gap: var(--gap-lg);

	.preview {
		&.light-mode {
			@extend .light-mode;
		}

		&.dark-mode {
			@extend .dark-mode;
		}

		&.oled-mode {
			@extend .oled-mode;
		}

		&.retro-mode {
			@extend .retro-mode;
		}

		&.skyline-mode {
			@extend .skyline-mode;
		}

		&.aurora-mode {
			@extend .aurora-mode;
		}

		&.grass-mode {
			@extend .grass-mode;
		}

		&.ender-mode {
			@extend .ender-mode;
		}

		&.lapis-mode {
			@extend .lapis-mode;
		}

		&.netherite-mode {
			@extend .netherite-mode;
		}

		&.deepslate-mode {
			@extend .deepslate-mode;
		}
	}

	.preview .block-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 6.5rem;
		border-radius: var(--radius-lg);
		border: 1px solid var(--surface-4);
		background:
			radial-gradient(60% 70% at 50% 55%, var(--color-brand-highlight) 0%, transparent 75%),
			var(--surface-2);

		img {
			height: 100%;
			width: auto;
			filter: drop-shadow(0 0.4rem 0.6rem rgba(0, 0, 0, 0.5));
			transition: transform 0.2s ease;
		}
	}

	.preview-radio:hover .block-preview img,
	.preview-radio.selected .block-preview img {
		transform: scale(1.06);
	}

	.preview-radio.selected .block-preview {
		border-color: var(--color-brand);
		box-shadow: 0 0 0.75rem var(--color-brand-shadow);
	}

	.preview .example-card {
		margin: 0;
		padding: 1rem;
		display: grid;
		grid-template: 'icon text1' 'icon text2';
		grid-template-columns: auto 1fr;
		gap: 0.5rem;
		outline: 2px solid transparent;

		.example-icon {
			grid-area: icon;
			width: 2rem;
			height: 2rem;
			background-color: var(--color-brand);
			border-radius: var(--radius-sm);
			outline: 2px solid transparent;
		}

		.example-text-1,
		.example-text-2 {
			height: 0.5rem;
			border-radius: var(--radius-sm);
			outline: 2px solid transparent;
		}

		.example-text-1 {
			grid-area: text1;
			width: 100%;
			background-color: var(--color-base);
		}

		.example-text-2 {
			grid-area: text2;
			width: 60%;
			background-color: var(--color-secondary);
		}
	}
}
</style>
