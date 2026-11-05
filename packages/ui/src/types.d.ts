/* eslint-disable @typescript-eslint/no-explicit-any */
type NonEmptyObject<T> = T extends object ? (keyof T extends never ? never : T) : never
type ValidKeys<T> = NonEmptyObject<T> extends infer O ? (O extends object ? keyof O : never) : never

declare module 'ace-builds' {
	export function define(
		name: string,
		deps: string[],
		factory: (require: (id: string) => any, exports: any, module: any) => void,
	): void
}

declare module 'ace-builds/src-noconflict/worker-*'
