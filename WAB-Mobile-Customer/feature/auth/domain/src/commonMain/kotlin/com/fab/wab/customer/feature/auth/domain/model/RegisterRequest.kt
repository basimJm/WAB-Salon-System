package com.fab.wab.customer.feature.auth.domain.model

import com.fab.wab.customer.core.domain.session.Gender

/** `POST /auth/register` (PRD S12): every field required, the phone proven by the OTP token. */
data class RegisterRequest(
    val firstName: String,
    val lastName: String,
    val email: String,
    val gender: Gender,
    val cityId: String,
    val areaId: String,
    val phone: PhoneNumber,
    val otpToken: String,
)
