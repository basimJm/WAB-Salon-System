package com.fab.wab.merchant.feature.application.domain.model

import com.fab.wab.merchant.core.domain.session.SalonState
import kotlin.time.Instant

/** Salon type (PRD M04): fixed after approval, only WAB can change it. Contract `salon.gender`. */
enum class SalonGender(val code: String) {
    MEN("MALE"),
    WOMEN("FEMALE"),
    ;

    companion object {
        fun fromCode(code: String?): SalonGender? = entries.firstOrNull { it.code == code }
    }
}

/** The salon application as the backend reports it (`GET /salon/application`, PRD M05). */
data class SalonApplication(
    val salonId: String,
    val state: SalonState,
    val submittedAt: Instant?,
    val resubmissionCount: Int,
    val rejectionReason: String?,
)

/** Everything M04 sends besides the phone proof; [documentKeys] are confirmed license uploads. */
data class RegistrationForm(
    val salonName: String,
    val gender: SalonGender,
    val firstName: String,
    val lastName: String,
    val cityId: String?,
    val areaId: String?,
    val documentKeys: List<String>,
    val description: String? = null,
)
