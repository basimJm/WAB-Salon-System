package com.fab.wab.customer.core.domain

sealed interface AppError {
    data class HttpError(val statusCode: Int, val message: String?) : AppError
    data class ParseError(val message: String?) : AppError
    data class NetworkError(val errorMsg: String) : AppError
    data class UnknownError(val errorMsg: String) : AppError
}
