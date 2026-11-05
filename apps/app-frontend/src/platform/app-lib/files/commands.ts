import { type Channel, invoke } from '@tauri-apps/api/core'

export interface LocalFileInfo {
	name: string
	size: number
}

export interface LocalUploadRequest {
	url: string
	headers: Record<string, string>
	path: string
	fileName?: string
	multipartField?: string
}

export interface LocalUploadProgress {
	loaded: number
	total: number
}

export interface LocalUploadResponse {
	status: number
	body: string
}

export function getLocalFileInfo(path: string): Promise<LocalFileInfo> {
	return invoke('plugin:files|file_local_info', { path })
}

export function uploadLocal(
	uploadId: string,
	request: LocalUploadRequest,
	onProgress: Channel<LocalUploadProgress>,
): Promise<LocalUploadResponse> {
	return invoke('plugin:files|file_upload_local', { uploadId, request, onProgress })
}

export function cancelLocalUpload(uploadId: string): Promise<void> {
	return invoke('plugin:files|file_cancel_local_upload', { uploadId })
}
