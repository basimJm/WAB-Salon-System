package com.fab.wab.customer.core.network

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import io.ktor.client.call.body
import io.ktor.client.plugins.HttpRequestTimeoutException
import io.ktor.client.plugins.ResponseException
import kotlinx.coroutines.CancellationException
import kotlinx.io.IOException
import kotlinx.serialization.SerializationException

private const val SAFE_API_TAG = "SafeApiCall"

private fun ApiErrorDto.displayMessage(): String? =
    listOfNotNull(
        message,
        fieldErrors.orEmpty().mapNotNull { it.message }.firstOrNull(),
        errors.values.flatten().firstOrNull(),
        error,
    ).firstOrNull { it.isNotBlank() }

private suspend fun parseBackendErrorMessage(e: ResponseException): String? =
    runCatching { e.response.body<ApiErrorDto>().displayMessage() }.getOrNull()

suspend fun <T> safeApiCall(block: suspend () -> T): AppResult<T> {
    return try {
        AppResult.Success(block())
    } catch (e: CancellationException) {
        throw e
    } catch (e: ResponseException) {
        val serverMessage = parseBackendErrorMessage(e)
        val displayMessage = serverMessage?.take(MAX_ERROR_MESSAGE_LENGTH)
            ?: e.message?.take(MAX_ERROR_MESSAGE_LENGTH)
            ?: "Request failed (${e.response.status.value})"
        AppResult.Error(
            AppError.HttpError(
                statusCode = e.response.status.value,
                message = displayMessage
            )
        )
    } catch (e: SerializationException) {
        AppResult.Error(
            AppError.ParseError(
                message = e.message?.take(MAX_ERROR_MESSAGE_LENGTH) ?: "Parse error"
            )
        )
    } catch (e: HttpRequestTimeoutException) {
        AppResult.Error(
            AppError.NetworkError(e.message ?: "Request timeout")
        )
    } catch (e: IOException) {
        AppResult.Error(
            AppError.NetworkError(e.message ?: "Network error")
        )
    } catch (e: Exception) {
        println("$SAFE_API_TAG: ${e}")
        AppResult.Error(
            AppError.UnknownError(e.message ?: "Unknown error")
        )
    }
}

private const val MAX_ERROR_MESSAGE_LENGTH = 500
