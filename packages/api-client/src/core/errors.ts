import type { ApiErrorData, ContentErrorResponse } from '../types/errors'
import { isContentErrorResponse } from '../types/errors'

/**
 * Base error class for all content API errors
 */
export class ContentApiError extends Error {
	/**
	 * HTTP status code (if available)
	 */
	readonly statusCode?: number

	/**
	 * Original error that was caught
	 */
	readonly originalError?: Error

	/**
	 * Response data from the API (if available)
	 */
	readonly responseData?: unknown

	/**
	 * Error context (e.g., module name, operation being performed)
	 */
	readonly context?: string

	/**
	 * Full URL of the request that failed (if available)
	 */
	url?: string

	constructor(message: string, data?: ApiErrorData) {
		super(message)
		this.name = 'ContentApiError'

		this.statusCode = data?.statusCode
		this.originalError = data?.originalError
		this.responseData = data?.responseData
		this.context = data?.context

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ContentApiError)
		}
	}

	/**
	 * Create a ContentApiError from an unknown error
	 */
	static fromUnknown(error: unknown, context?: string): ContentApiError {
		if (error instanceof ContentApiError) {
			return error
		}

		if (error instanceof Error) {
			return new ContentApiError(error.message, {
				originalError: error,
				context,
			})
		}

		return new ContentApiError(String(error), { context })
	}
}

/**
 * Error class for content API server errors
 * Extends ContentApiError with V1 error response parsing
 */
export class ContentServerError extends ContentApiError {
	/**
	 * V1 error information (if available)
	 */
	readonly v1Error?: ContentErrorResponse

	constructor(message: string, data?: ApiErrorData & { v1Error?: ContentErrorResponse }) {
		const errorMessage = data?.v1Error ? formatV1ErrorMessage(data.v1Error) : message

		super(errorMessage, data)
		this.name = 'ContentServerError'
		this.v1Error = data?.v1Error

		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ContentServerError)
		}
	}

	/**
	 * Create a ContentServerError from response data
	 */
	static fromResponse(
		statusCode: number,
		responseData: unknown,
		context?: string,
	): ContentServerError {
		const v1Error = isContentErrorResponse(responseData) ? responseData : undefined
		const isHtmlPage =
			typeof responseData === 'string' && /<!doctype html|<html/i.test(responseData)

		const message =
			typeof responseData === 'string' && !isHtmlPage ? responseData : `HTTP ${statusCode}`

		return new ContentServerError(message, {
			statusCode,
			responseData: isHtmlPage ? undefined : responseData,
			context,
			v1Error,
		})
	}

	/**
	 * Create a ContentServerError from an unknown error
	 */
	static fromUnknown(error: unknown, context?: string): ContentServerError {
		if (error instanceof ContentServerError) {
			return error
		}

		if (error instanceof ContentApiError) {
			return new ContentServerError(error.message, {
				statusCode: error.statusCode,
				originalError: error.originalError,
				responseData: error.responseData,
				context: context ?? error.context,
			})
		}

		if (error instanceof Error) {
			return new ContentServerError(error.message, {
				originalError: error,
				context,
			})
		}

		return new ContentServerError(String(error), { context })
	}
}

function formatV1ErrorMessage(error: ContentErrorResponse): string {
	return readableErrorDetail(error.details) ?? error.description
}

function readableErrorDetail(details: unknown): string | undefined {
	if (typeof details === 'string') {
		const trimmed = details.trim()
		return trimmed || undefined
	}

	if (!Array.isArray(details)) {
		return undefined
	}

	return details
		.findLast((detail): detail is string => {
			if (typeof detail !== 'string') {
				return false
			}
			const trimmed = detail.trim()
			return Boolean(trimmed)
		})
		?.trim()
}
