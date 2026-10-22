package com.fab.wab.merchant.feature.auth.data

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.feature.auth.data.repository.phoneCheckOf
import com.fab.wab.merchant.feature.auth.domain.model.PhoneCheck
import kotlin.test.Test
import kotlin.test.assertEquals

private const val NOT_FOUND = 404
private const val FORBIDDEN = 403
private const val SERVER = 500

class PhoneCheckMapperTest {

    private fun server(code: ErrorCode, status: Int) = AppResult.Error(AppError.ServerError(code, status, null))

    @Test
    fun contractOutcomesBecomeValues() {
        assertEquals(AppResult.Success(PhoneCheck.REGISTERED), phoneCheckOf(AppResult.Success(null)))
        assertEquals(AppResult.Success(PhoneCheck.NOT_REGISTERED), phoneCheckOf(server(ErrorCode.PHONE_NOT_REGISTERED, NOT_FOUND)))
        assertEquals(AppResult.Success(PhoneCheck.BLOCKED), phoneCheckOf(server(ErrorCode.ACCOUNT_BLOCKED, FORBIDDEN)))
        assertEquals(AppResult.Success(PhoneCheck.INACTIVE), phoneCheckOf(server(ErrorCode.MEMBER_INACTIVE, FORBIDDEN)))
    }

    @Test
    fun otherFailuresStayErrors() {
        val internal = server(ErrorCode.INTERNAL, SERVER)
        assertEquals(internal, phoneCheckOf(internal))
        val offline = AppResult.Error(AppError.NetworkError("offline"))
        assertEquals(offline, phoneCheckOf(offline))
    }
}
