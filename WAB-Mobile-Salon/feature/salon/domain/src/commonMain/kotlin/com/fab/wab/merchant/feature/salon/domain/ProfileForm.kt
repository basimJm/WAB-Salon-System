package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.salon.SalonProfile

/** The editable part of `GET /salon` (PRD M13); images are storage keys once uploaded, URLs for display. */
data class ProfileForm(
    val name: String = "",
    val description: String = "",
    val coverKey: String? = null,
    val coverUrl: String? = null,
    val profileKey: String? = null,
    val profileUrl: String? = null,
    val location: LocationData? = null,
    val locationText: String = "",
    val cityId: String? = null,
    val areaId: String? = null,
    val phone: String = "",
    val whatsapp: String = "",
)

enum class ProfileField { NAME, DESCRIPTION, LOCATION, LOCATION_TEXT, PHONE, WHATSAPP }

/** `PATCH /salon/profile` limits (contract). */
object ProfileLimits {
    const val NAME_MAX = 80
    const val DESCRIPTION_MAX = 1_000
    const val LOCATION_TEXT_MAX = 300

    /** E.164 as the contract validates it. */
    val PHONE_PATTERN = Regex("^\\+[1-9][0-9]{6,14}$")
}

fun SalonProfile.toForm(): ProfileForm = ProfileForm(
    name = name,
    description = description.orEmpty(),
    coverKey = coverKey,
    coverUrl = coverUrl,
    profileKey = profileKey,
    profileUrl = profileUrl,
    location = location,
    locationText = locationText.orEmpty(),
    cityId = cityId,
    areaId = areaId,
    phone = phone.orEmpty(),
    whatsapp = whatsapp.orEmpty(),
)

/** Spaces and dashes typed in a phone number are dropped before validating / sending. */
fun normalizePhone(raw: String): String = raw.filter { it == PLUS || it.isDigit() }

private const val PLUS = '+'

/** PRD M13 validation: name required, description ≤ 1000, location pinned, phone required, WhatsApp optional (both E.164). */
fun profileErrors(form: ProfileForm): Set<ProfileField> = buildSet {
    val name = form.name.trim()
    if (name.isEmpty() || name.length > ProfileLimits.NAME_MAX) add(ProfileField.NAME)
    if (form.description.trim().length > ProfileLimits.DESCRIPTION_MAX) add(ProfileField.DESCRIPTION)
    if (form.location == null) add(ProfileField.LOCATION)
    if (form.locationText.trim().length > ProfileLimits.LOCATION_TEXT_MAX) add(ProfileField.LOCATION_TEXT)
    if (!ProfileLimits.PHONE_PATTERN.matches(normalizePhone(form.phone))) add(ProfileField.PHONE)
    val whatsapp = normalizePhone(form.whatsapp)
    if (whatsapp.isNotEmpty() && !ProfileLimits.PHONE_PATTERN.matches(whatsapp)) add(ProfileField.WHATSAPP)
}

/** What changed between the loaded salon and the form; only these fields are sent. */
data class ProfileChanges(
    val name: String? = null,
    /** Some(null) clears the field. */
    val description: Change<String?>? = null,
    val coverKey: String? = null,
    val profileKey: String? = null,
    val location: LocationData? = null,
    val locationText: Change<String?>? = null,
    val cityId: String? = null,
    val areaId: String? = null,
    val phone: String? = null,
    val whatsapp: Change<String?>? = null,
) {
    val isEmpty: Boolean get() = this == ProfileChanges()
}

/** A value to set, where `null` inside means "clear it". */
data class Change<T>(val value: T)

fun changesOf(original: ProfileForm, edited: ProfileForm): ProfileChanges {
    fun text(before: String, after: String): Change<String?>? = after.trim().takeIf { it != before.trim() }?.let { Change(it.ifEmpty { null }) }
    return ProfileChanges(
        name = edited.name.trim().takeIf { it != original.name.trim() },
        description = text(original.description, edited.description),
        coverKey = edited.coverKey.takeIf { it != original.coverKey },
        profileKey = edited.profileKey.takeIf { it != original.profileKey },
        location = edited.location.takeIf { it != original.location },
        locationText = text(original.locationText, edited.locationText),
        cityId = edited.cityId.takeIf { it != original.cityId },
        areaId = edited.areaId.takeIf { it != original.areaId },
        phone = normalizePhone(edited.phone).takeIf { it != normalizePhone(original.phone) },
        whatsapp = text(normalizePhone(original.whatsapp), normalizePhone(edited.whatsapp)),
    )
}

/** `PATCH /salon/profile`; on success the shared salon source is refreshed (completeness, hub, home). */
interface SalonProfileRepository {
    suspend fun update(changes: ProfileChanges): AppResult<SalonProfile>
}
