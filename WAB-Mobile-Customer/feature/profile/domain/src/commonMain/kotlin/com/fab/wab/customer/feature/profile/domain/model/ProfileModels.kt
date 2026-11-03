package com.fab.wab.customer.feature.profile.domain.model

import com.fab.wab.customer.core.domain.session.Gender

/** `GET /profile` (PRD S21 header, S22 form). */
data class CustomerAccount(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val gender: Gender?,
    val phoneE164: String,
    val phoneCountryCode: String,
    val phoneNumber: String,
    val cityId: String,
    val areaId: String,
    val avatarUrl: String?,
    val pushEnabled: Boolean,
) {
    val fullName: String get() = listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(NAME_SEPARATOR)

    private companion object {
        const val NAME_SEPARATOR = " "
    }
}

object ProfileDefaults {
    /** PRD S21: the account is deactivated for 30 days before permanent deletion. */
    const val DELETION_GRACE_DAYS = 30
    const val MAX_NICKNAME_LENGTH = 50
}

/** `PATCH /profile` fields of S22 (phone changes go through `POST /auth/change-phone`). */
data class ProfileUpdate(
    val firstName: String,
    val lastName: String,
    val email: String,
    val gender: Gender,
    val cityId: String,
    val areaId: String,
)
