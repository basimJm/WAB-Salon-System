package com.fab.wab.merchant.feature.auth.domain.repository

import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/** Hands a verified phone back to the flow that asked for the OTP (register, change phone, booking confirmation). */
class PendingOtpVerification {
    private val state = MutableStateFlow<OtpVerified?>(null)
    val current: StateFlow<OtpVerified?> = state.asStateFlow()

    fun publish(verified: OtpVerified) {
        state.value = verified
    }

    /** Returns and clears the pending value so a proof is used once. */
    fun consume(): OtpVerified? = state.value.also { state.value = null }
}
