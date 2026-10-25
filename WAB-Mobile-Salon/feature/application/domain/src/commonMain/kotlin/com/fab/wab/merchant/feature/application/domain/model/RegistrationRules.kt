package com.fab.wab.merchant.feature.application.domain.model

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
enum class RegistrationField { SALON_NAME, GENDER, FIRST_NAME, LAST_NAME, CITY, AREA, DOCUMENTS, TERMS }

/** Raw input of the form before it becomes a [RegistrationForm]. */
data class RegistrationInput(
    val salonName: String = "",
    val gender: SalonGender? = null,
    val firstName: String = "",
    val lastName: String = "",
    val cityId: String? = null,
    val areaId: String? = null,
    val documentKeys: List<String> = emptyList(),
    val documentsUploading: Boolean = false,
    val termsAccepted: Boolean = false,
)

private fun String.validName(max: Int): Boolean = trim().let { it.isNotEmpty() && it.length <= max }

/** Fields a resubmission sends (`POST /salon/application/resubmit`: name, type, documents). */
val RESUBMISSION_FIELDS: Set<RegistrationField> = setOf(RegistrationField.SALON_NAME, RegistrationField.GENDER, RegistrationField.DOCUMENTS)

/**
 * Every rule [input] breaks (PRD M04: all fields required, 1–5 uploaded documents, terms accepted); a [resubmission]
 * checks only [RESUBMISSION_FIELDS].
 */
fun registrationErrors(input: RegistrationInput, requireTerms: Boolean = true, resubmission: Boolean = false): Set<RegistrationField> {
    val all = allErrors(input, requireTerms && !resubmission)
    return if (resubmission) all intersect RESUBMISSION_FIELDS else all
}

private fun allErrors(input: RegistrationInput, requireTerms: Boolean): Set<RegistrationField> = buildSet {
    if (!input.salonName.validName(RegistrationLimits.SALON_NAME_MAX)) add(RegistrationField.SALON_NAME)
    if (input.gender == null) add(RegistrationField.GENDER)
    if (!input.firstName.validName(RegistrationLimits.PERSON_NAME_MAX)) add(RegistrationField.FIRST_NAME)
    if (!input.lastName.validName(RegistrationLimits.PERSON_NAME_MAX)) add(RegistrationField.LAST_NAME)
    if (input.cityId == null) add(RegistrationField.CITY)
    if (input.areaId == null) add(RegistrationField.AREA)
    val documents = input.documentKeys.size
    if (input.documentsUploading || documents < RegistrationLimits.DOCUMENTS_MIN || documents > RegistrationLimits.DOCUMENTS_MAX) {
        add(RegistrationField.DOCUMENTS)
    }
    if (requireTerms && !input.termsAccepted) add(RegistrationField.TERMS)
}

/** The trimmed form, or null while any rule is broken. */
fun RegistrationInput.toForm(requireTerms: Boolean = true, resubmission: Boolean = false): RegistrationForm? {
    if (registrationErrors(this, requireTerms, resubmission).isNotEmpty()) return null
    val selectedGender = gender ?: return null
    return RegistrationForm(
        salonName = salonName.trim(),
        gender = selectedGender,
        firstName = firstName.trim(),
        lastName = lastName.trim(),
        cityId = cityId,
        areaId = areaId,
        documentKeys = documentKeys,
    )
}
