<script setup lang="ts">
import { injectNotificationManager } from '@crafton/ui'
import { open } from '@tauri-apps/plugin-dialog'
import { inject } from 'vue'
import { useRouter } from 'vue-router'

import addIcon from '@/assets/redesign/icon-add.webp'
import downloadIcon from '@/assets/redesign/icon-download.webp'
import instancesIcon from '@/assets/redesign/icon-instances.webp'
import searchIcon from '@/assets/redesign/icon-search.webp'
import settingsIcon from '@/assets/redesign/icon-settings.webp'
import HomePanel from '@/components/ui/home/HomePanel.vue'
import {
	install_create_modpack_instance,
	install_get_modpack_preview,
	installJobInstanceId,
} from '@/helpers/install'

const router = useRouter()
const { handleError, addNotification } = injectNotificationManager()
const showCreationModal = inject<() => void>('showCreationModal')
const showImportModal = inject<() => Promise<void>>('showImportModal')

async function installFromFile() {
	try {
		const picked = await open({
			multiple: false,
			directory: false,
			filters: [{ name: 'Modpack', extensions: ['mrpack'] }],
		})
		if (typeof picked !== 'string') return
		const location = { type: 'fromFile', path: picked } as const
		const preview = await install_get_modpack_preview(location)
		if (preview.unknownFile || (preview.externalFilesInModpack?.length ?? 0) > 0) {
			// Packs with files from outside Modrinth need the review step in the creation window.
			addNotification({
				title: 'Check this pack first',
				text: 'It contains files from outside Modrinth. Use Create Instance, then Upload modpack, to review them before installing.',
				type: 'warning',
			})
			return
		}
		const job = await install_create_modpack_instance(location)
		const instanceId = installJobInstanceId(job)
		if (instanceId) await router.push(`/instance/${encodeURIComponent(instanceId)}`)
	} catch (error) {
		handleError(error as Error)
	}
}

const actions = [
	{
		id: 'browse',
		label: 'Browse Content',
		icon: searchIcon,
		tone: 'purple',
		run: () => router.push('/browse/modpack'),
	},
	{
		id: 'file',
		label: 'Install from File',
		icon: downloadIcon,
		tone: 'blue',
		run: installFromFile,
	},
	{
		id: 'create',
		label: 'Create Instance',
		icon: addIcon,
		tone: 'green',
		run: () => showCreationModal?.(),
	},
	{
		id: 'import',
		label: 'Import Instances',
		icon: instancesIcon,
		tone: 'bronze',
		run: () => showImportModal?.(),
	},
] as const
</script>

<template>
	<HomePanel title="Quick Actions" :icon="settingsIcon">
		<div class="quick-actions">
			<button
				v-for="action in actions"
				:key="action.id"
				class="quick-action"
				:class="`quick-action--${action.tone}`"
				@click="action.run()"
			>
				<img :src="action.icon" alt="" draggable="false" />
				<span>{{ action.label }}</span>
			</button>
		</div>
	</HomePanel>
</template>

<style scoped lang="scss">
.quick-actions {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.75rem;
}

.quick-action {
	--tone: #8b5cf6;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
	min-height: 6rem;
	padding: 0.75rem 0.5rem;
	border-radius: 0.9rem;
	border: 1px solid color-mix(in srgb, var(--tone) 65%, transparent);
	background: linear-gradient(
		180deg,
		color-mix(in srgb, var(--tone) 45%, var(--surface-3)) 0%,
		color-mix(in srgb, var(--tone) 22%, var(--surface-2)) 100%
	);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.12),
		0 0.35rem 0.9rem rgba(0, 0, 0, 0.3);
	color: #fff;
	font-size: 0.85rem;
	font-weight: 800;
	line-height: 1.15;
	text-align: center;
	text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
	cursor: pointer;
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease,
		filter 0.15s ease;

	img {
		width: 2.25rem;
		height: 2.25rem;
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
	}

	&:hover {
		transform: translateY(-2px);
		filter: brightness(1.12);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.16),
			0 0 1rem color-mix(in srgb, var(--tone) 45%, transparent);
	}

	&:active {
		transform: translateY(0);
	}

	&--purple {
		--tone: #8b5cf6;
	}

	&--blue {
		--tone: #2f7fe0;
	}

	&--green {
		--tone: #2fae4f;
	}

	&--bronze {
		--tone: #c98a4b;
	}
}
</style>
