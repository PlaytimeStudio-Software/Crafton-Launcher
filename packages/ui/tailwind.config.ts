import preset from '@crafton/tooling-config/tailwind/tailwind-preset.ts'
import type { Config } from 'tailwindcss'

const config: Config = {
	content: ['./src/**/*.{js,vue,ts,mdx}', '../../apps/frontend/src/**/*.{js,vue,ts,mdx}'],
	presets: [preset],
}

export default config
