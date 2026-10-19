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
    val avatarUrl: String?,
    val pushEnabled: Boolean,
) {
    val fullName: String get() = listOf(firstName, lastName).filter { it.isNotBlank() }.joinToString(NAME_SEPARATOR)

    private companion object {
        const val NAME_SEPARATOR = " "
    }
}

/** `POST /uploads/presign` result: where and how the device PUTs the bytes (PRD §3.16). */
data class PresignedUpload(
    val key: String,
    val url: String,
    val method: String,
    val headers: Map<String, String>,
    val maxBytes: Long,
)

object UploadPurpose {
    const val CUSTOMER_AVATAR = "CUSTOMER_AVATAR"
}

object ProfileDefaults {
    /** PRD S21: the account is deactivated for 30 days before permanent deletion. */
    const val DELETION_GRACE_DAYS = 30
    const val MAX_NICKNAME_LENGTH = 50
}
