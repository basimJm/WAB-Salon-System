package com.fab.wab.merchant.feature.application.domain.model

import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.upload.UploadLimits

/** PRD §12 limits for the registration form. */
object RegistrationLimits {
    const val SALON_NAME_MAX = 80
    const val PERSON_NAME_MAX = 50
    const val DESCRIPTION_MAX = 1000
    const val DOCUMENTS_MIN = UploadLimits.DOCUMENT_MIN_FILES
    const val DOCUMENTS_MAX = UploadLimits.DOCUMENT_MAX_FILES
}

/** Fields that can be wrong on M04 (the screen shows one message per field). */
enum class RegistrationField { BUSINESS_TYPE, SALON_NAME, AUDIENCE, FIRST_NAME, LAST_NAME, CITY, AREA, DOCUMENTS, MEDICAL_LICENSE, TERMS }

/** Raw input of the form before it becomes a [RegistrationForm]. */
data class RegistrationInput(
    val businessType: BusinessType? = null,
    val salonName: String = "",
    val audience: Audience? = null,
    val firstName: String = "",
    val lastName: String = "",
    val cityId: String? = null,
    val areaId: String? = null,
    val documentKeys: List<String> = emptyList(),
    val documentsUploading: Boolean = false,
    val medicalLicenseKeys: List<String> = emptyList(),
    val medicalUploading: Boolean = false,
    val termsAccepted: Boolean = false,
) {
    /** Type + audience once chosen (a clinic is always BOTH, §5.19); null while the type or a salon's audience is missing. */
    val kind: BusinessKind? get() = businessType?.let { BusinessKind.of(it, audience) }
}

private fun String.validName(max: Int): Boolean = trim().let { it.isNotEmpty() && it.length <= max }

/**
 * Fields a resubmission sends (`POST /salon/application/resubmit`: name, audience, documents, medical license); the
 * business type is the salon's own and never changes.
 */
val RESUBMISSION_FIELDS: Set<RegistrationField> = setOf(
    RegistrationField.BUSINESS_TYPE,
    RegistrationField.SALON_NAME,
    RegistrationField.AUDIENCE,
    RegistrationField.DOCUMENTS,
    RegistrationField.MEDICAL_LICENSE,
)

/**
 * Every rule [input] breaks (PRD M04 + BUSINESS_DOMAIN §5.19: type chosen, a salon's audience chosen, all fields
 * required, 1–5 uploaded documents, a clinic's 1–5 medical license files, terms accepted); a [resubmission] checks only
 * [RESUBMISSION_FIELDS] and keeps the medical license already on file unless new files are added.
 */
fun registrationErrors(input: RegistrationInput, requireTerms: Boolean = true, resubmission: Boolean = false): Set<RegistrationField> {
    val all = allErrors(input, requireTerms && !resubmission, requireMedical = !resubmission)
    return if (resubmission) all intersect RESUBMISSION_FIELDS else all
}

private fun outOfRange(count: Int, uploading: Boolean, min: Int): Boolean =
    uploading || count < min || count > RegistrationLimits.DOCUMENTS_MAX

/** §5.19: the type is chosen, a salon chose its audience, a clinic uploaded its medical license. */
private fun typeErrors(input: RegistrationInput, requireMedical: Boolean): Set<RegistrationField> = buildSet {
    when (input.businessType) {
        null -> add(RegistrationField.BUSINESS_TYPE)
        BusinessType.SALON -> if (input.audience == null) add(RegistrationField.AUDIENCE)
        BusinessType.CLINIC -> {
            val min = if (requireMedical) RegistrationLimits.DOCUMENTS_MIN else 0
            if (outOfRange(input.medicalLicenseKeys.size, input.medicalUploading, min)) add(RegistrationField.MEDICAL_LICENSE)
        }
    }
}

private fun allErrors(input: RegistrationInput, requireTerms: Boolean, requireMedical: Boolean): Set<RegistrationField> = buildSet {
    addAll(typeErrors(input, requireMedical))
    if (!input.salonName.validName(RegistrationLimits.SALON_NAME_MAX)) add(RegistrationField.SALON_NAME)
    if (!input.firstName.validName(RegistrationLimits.PERSON_NAME_MAX)) add(RegistrationField.FIRST_NAME)
    if (!input.lastName.validName(RegistrationLimits.PERSON_NAME_MAX)) add(RegistrationField.LAST_NAME)
    if (input.cityId == null) add(RegistrationField.CITY)
    if (input.areaId == null) add(RegistrationField.AREA)
    if (outOfRange(input.documentKeys.size, input.documentsUploading, RegistrationLimits.DOCUMENTS_MIN)) add(RegistrationField.DOCUMENTS)
    if (requireTerms && !input.termsAccepted) add(RegistrationField.TERMS)
}

/** The trimmed form, or null while any rule is broken. */
fun RegistrationInput.toForm(requireTerms: Boolean = true, resubmission: Boolean = false): RegistrationForm? {
    if (registrationErrors(this, requireTerms, resubmission).isNotEmpty()) return null
    val chosen = kind ?: return null
    return RegistrationForm(
        salonName = salonName.trim(),
        kind = chosen,
        firstName = firstName.trim(),
        lastName = lastName.trim(),
        cityId = cityId,
        areaId = areaId,
        documentKeys = documentKeys,
        medicalLicenseKeys = if (chosen.isClinic) medicalLicenseKeys else emptyList(),
    )
}
