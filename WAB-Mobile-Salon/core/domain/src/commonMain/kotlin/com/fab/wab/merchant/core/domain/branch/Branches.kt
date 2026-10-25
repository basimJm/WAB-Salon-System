package com.fab.wab.merchant.core.domain.branch

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.ErrorCode
import com.fab.wab.merchant.core.domain.model.LocationData
import kotlinx.coroutines.flow.StateFlow

/** BUSINESS_DOMAIN §2 `BranchStatus`. */
enum class BranchStatus {
    ACTIVE,
    OFFLINE,
    CLOSED,
    ;

    companion object {
        /** Unknown values read as CLOSED (nothing can be done with a branch the app does not understand). */
        fun fromCode(code: String?): BranchStatus = entries.firstOrNull { it.name == code } ?: CLOSED
    }
}

/** A branch name in both languages (BUSINESS_DOMAIN §3.3a `name {ar, en}`). */
data class BranchName(val ar: String, val en: String) {
    /** The name in the app language (a locale tag such as `ar` or `ar_JO`), falling back to the other one when blank. */
    fun localized(language: String): String = if (language.startsWith(ARABIC)) ar.ifBlank { en } else en.ifBlank { ar }

    private companion object {
        const val ARABIC = "ar"
    }
}

/** `BranchView` of the merchant contract: one branch of the salon (owner management, switcher, labels). */
data class Branch(
    val id: String,
    val name: BranchName,
    val isMain: Boolean,
    val status: BranchStatus,
    val location: LocationData?,
    val locationText: String?,
    val cityId: String?,
    val areaId: String?,
    val phone: String?,
    val whatsapp: String?,
    val offlineReason: String?,
    val missing: List<String>,
) {
    val isComplete: Boolean get() = missing.isEmpty()

    /** BUSINESS_DOMAIN §5.16: any branch can become main except a closed one or the current main. */
    val canBecomeMain: Boolean get() = !isMain && status != BranchStatus.CLOSED
    val canGoOffline: Boolean get() = status == BranchStatus.ACTIVE
    val canGoOnline: Boolean get() = status == BranchStatus.OFFLINE

    /** Closing the main branch needs a new main first (the server answers `INVALID_TRANSITION`). */
    val canClose: Boolean get() = !isMain && status != BranchStatus.CLOSED
}

/** Create / edit body (`POST /branches`, `PATCH /branches/{id}`); every field is required by the create contract. */
data class BranchForm(
    val nameAr: String = "",
    val nameEn: String = "",
    val location: LocationData? = null,
    val locationText: String = "",
    val cityId: String? = null,
    val areaId: String? = null,
    val phone: String = "",
    val whatsapp: String = "",
)

enum class BranchField { NAME_AR, NAME_EN, LOCATION, LOCATION_TEXT, CITY, AREA, PHONE, WHATSAPP }

/** `POST /branches` limits (contract). */
object BranchLimits {
    const val NAME_MAX = 60
    const val LOCATION_TEXT_MAX = 300
    const val OFFLINE_REASON_MAX = 1_000

    /** E.164 as the contract validates it. */
    val PHONE_PATTERN = Regex("^\\+[1-9][0-9]{6,14}$")
}

/** Spaces and dashes typed in a phone number are dropped before validating / sending. */
fun normalizeBranchPhone(raw: String): String = raw.filter { it == PLUS || it.isDigit() }

private const val PLUS = '+'

/** Create / edit validation: both names 1..60, pin, address 1..300, city, area, phone (E.164), WhatsApp optional. */
fun branchFormErrors(form: BranchForm): Set<BranchField> = buildSet {
    fun bad(value: String, max: Int) = value.trim().let { it.isEmpty() || it.length > max }
    if (bad(form.nameAr, BranchLimits.NAME_MAX)) add(BranchField.NAME_AR)
    if (bad(form.nameEn, BranchLimits.NAME_MAX)) add(BranchField.NAME_EN)
    if (form.location == null) add(BranchField.LOCATION)
    if (bad(form.locationText, BranchLimits.LOCATION_TEXT_MAX)) add(BranchField.LOCATION_TEXT)
    if (form.cityId == null) add(BranchField.CITY)
    if (form.areaId == null) add(BranchField.AREA)
    if (!BranchLimits.PHONE_PATTERN.matches(normalizeBranchPhone(form.phone))) add(BranchField.PHONE)
    val whatsapp = normalizeBranchPhone(form.whatsapp)
    if (whatsapp.isNotEmpty() && !BranchLimits.PHONE_PATTERN.matches(whatsapp)) add(BranchField.WHATSAPP)
}

fun Branch.toForm(): BranchForm = BranchForm(
    nameAr = name.ar,
    nameEn = name.en,
    location = location,
    locationText = locationText.orEmpty(),
    cityId = cityId,
    areaId = areaId,
    phone = phone.orEmpty(),
    whatsapp = whatsapp.orEmpty(),
)

/** Owner branch management (`/merchant/v1/branches…`, OWNER only) plus the shared list the switcher reads. */
interface BranchesRepository {
    /** Last loaded branches, main first; empty until [refresh] succeeds. */
    val branches: StateFlow<List<Branch>>

    suspend fun refresh(): AppResult<List<Branch>>

    suspend fun create(form: BranchForm): AppResult<Branch>

    suspend fun update(id: String, form: BranchForm): AppResult<Branch>

    suspend fun setMain(id: String): AppResult<Branch>

    suspend fun setOffline(id: String, reason: String): AppResult<Branch>

    suspend fun setOnline(id: String): AppResult<Branch>

    /** `409 BRANCH_HAS_UPCOMING_BOOKINGS` carries the blocking booking ids (see [blockingBookingIds]). */
    suspend fun close(id: String): AppResult<Branch>
}

/** Booking ids that keep a branch from closing (`409 BRANCH_HAS_UPCOMING_BOOKINGS`, ids in `details[].field`). */
fun AppError.blockingBookingIds(): List<String>? {
    val server = this as? AppError.ServerError ?: return null
    if (server.code != ErrorCode.BRANCH_HAS_UPCOMING_BOOKINGS) return null
    return server.details.map { it.field }.filter { it.isNotBlank() }.distinct()
}

/** Main first, then by status (active, offline, closed), then by the English name. */
fun List<Branch>.ordered(): List<Branch> =
    sortedWith(compareByDescending<Branch> { it.isMain }.thenBy { it.status.ordinal }.thenBy { it.name.en })
