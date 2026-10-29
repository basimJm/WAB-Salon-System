package com.fab.wab.merchant.feature.application.domain.model

import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.session.SalonState
import kotlin.time.Instant

/** The salon application as the backend reports it (`GET /salon/application`, PRD M05). */
data class SalonApplication(
    val salonId: String,
    val state: SalonState,
    val submittedAt: Instant?,
    val resubmissionCount: Int,
    val rejectionReason: String?,
)

/**
 * Everything M04 sends besides the phone proof; [documentKeys] are confirmed license uploads, [medicalLicenseKeys] the
 * clinic's confirmed medical license uploads (BUSINESS_DOMAIN §5.19, empty for a salon).
 */
data class RegistrationForm(
    val salonName: String,
    val kind: BusinessKind,
    val firstName: String,
    val lastName: String,
    val cityId: String?,
    val areaId: String?,
    val documentKeys: List<String>,
    val medicalLicenseKeys: List<String> = emptyList(),
    val description: String? = null,
)
