package com.fab.wab.merchant.feature.branches.presentation.controller.error

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.branches.presentation.resources.Res
import com.fab.wab.merchant.feature.branches.presentation.resources.branch_error_invalid_status
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.getString

/**
 * Branch lifecycle refusals (closing the main branch, an action the branch's status does not allow) keep the
 * `INVALID_TRANSITION` code (SRV-151, contract 1.4.0); the shared text speaks of bookings, so the branch screens
 * use their own string for that code. Every other error keeps the shared code table.
 */
fun branchErrorResource(error: AppError): StringResource? =
    if (error is AppError.ServerError && error.code == ErrorCode.INVALID_TRANSITION) Res.string.branch_error_invalid_status else null

suspend fun branchErrorText(error: AppError): String = branchErrorResource(error)?.let { getString(it) } ?: appErrorText(error)
