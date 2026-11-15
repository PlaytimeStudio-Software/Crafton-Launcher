<script setup lang="ts">
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import addIcon from '@/assets/redesign/icon-add.webp'
import downloadIcon from '@/assets/redesign/icon-download.webp'
import playIcon from '@/assets/redesign/icon-play.webp'
import refreshIcon from '@/assets/redesign/icon-refresh.webp'
import HomePanel from '@/components/ui/home/HomePanel.vue'
import type { GameInstance } from '@/helpers/types'

dayjs.extend(relativeTime)

const props = defineProps<{
	instances: GameInstance[]
	runningIds: string[]
}>()

const router = useRouter()

type ActivityKind = 'running' | 'played' | 'changed' | 'created'

interface ActivityItem {
	key: string
	kind: ActivityKind
	instance: GameInstance
	at: dayjs.Dayjs
}

const ICONS: Record<ActivityKind, string> = {
	running: playIcon,
	played: playIcon,
	changed: refreshIcon,
	created: addIcon,
}

const LABELS: Record<ActivityKind, string> = {
	running: 'is running',
	played: 'played',
	changed: 'changed',
	created: 'added',
}

// Built from what the launcher already records for each instance: when it was created, last
// changed and last played. A change within a minute of a launch is the launch itself, not an edit.
const items = computed<ActivityItem[]>(() => {
	const list: ActivityItem[] = []
	for (const instance of props.instances) {
		const created = dayjs(instance.created)
		const modified = dayjs(instance.modified)
		const played = instance.last_played ? dayjs(instance.last_played) : null
		if (props.runningIds.includes(instance.id)) {
			list.push({ key: `${instance.id}:running`, kind: 'running', instance, at: played ?? dayjs() })
		} else if (played) {
			list.push({ key: `${instance.id}:played`, kind: 'played', instance, at: played })
		}
		list.push({ key: `${instance.id}:created`, kind: 'created', instance, at: created })
		const nearLaunch = played && Math.abs(modified.diff(played, 'second')) < 60
		if (modified.diff(created, 'second') > 60 && !nearLaunch) {
			list.push({ key: `${instance.id}:changed`, kind: 'changed', instance, at: modified })
		}
	}
	return list
		.sort((a, b) => {
			if (a.kind === 'running' && b.kind !== 'running') return -1
			if (b.kind === 'running' && a.kind !== 'running') return 1
			return b.at.valueOf() - a.at.valueOf()
		})
		.slice(0, 4)
})

function open(instance: GameInstance) {
	router.push(`/instance/${encodeURIComponent(instance.id)}`)
}
</script>

<template>
	<HomePanel title="Activity" :icon="downloadIcon">
		<ul v-if="items.length" class="activity-list">
			<li v-for="item in items" :key="item.key">
				<button class="activity-item" @click="open(item.instance)">
					<span class="activity-item__badge" :class="`activity-item__badge--${item.kind}`">
						<img :src="ICONS[item.kind]" alt="" draggable="false" />
					</span>
					<span class="flex min-w-0 flex-col">
						<span class="truncate text-sm font-semibold text-contrast">
							<template v-if="item.kind === 'running'">
								{{ item.instance.name }} {{ LABELS[item.kind] }}
							</template>
							<template v-else>
								{{ LABELS[item.kind].charAt(0).toUpperCase() + LABELS[item.kind].slice(1) }}
								{{ item.instance.name }}
							</template>
						</span>
						<span class="text-xs text-secondary">
							{{ item.kind === 'running' ? 'right now' : item.at.fromNow() }}
						</span>
					</span>
				</button>
			</li>
		</ul>
		<p v-else class="m-0 text-sm text-secondary">
			Nothing yet. Play or add an instance to see it here.
		</p>
	</HomePanel>
</template>

<style scoped lang="scss">
.activity-list {
	display: flex;
	flex-direction: column;
	gap: 0.25rem;
	margin: 0;
	padding: 0;
	list-style: none;
}

.activity-item {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	width: 100%;
	padding: 0.5rem;
	border: none;
	border-radius: 0.75rem;
	background: transparent;
	text-align: left;
	cursor: pointer;
	transition: background-color 0.15s ease;

	&:hover {
		background-color: var(--surface-3);
	}
}

.activity-item__badge {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 2.25rem;
	height: 2.25rem;
	flex-shrink: 0;
	border-radius: 0.6rem;
	background: var(--surface-3);
	border: 1px solid var(--surface-5);

	img {
		width: 1.4rem;
		height: 1.4rem;
	}

	&--running {
		border-color: rgba(74, 222, 128, 0.6);
		box-shadow: 0 0 0.5rem rgba(74, 222, 128, 0.35);
	}
}
</style>
