package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import kotlinx.coroutines.flow.Flow

/** A salon service (`GET /salon/services`); [price] is the JOD decimal string from the server (tax inclusive). */
data class SalonService(
    val id: String,
    val catalogId: String,
    val name: String,
    val imageUrl: String,
    val price: String,
    val durationMinutes: Int,
    val brideOnly: Boolean,
    val extraDescription: String?,
    val mediaUrls: List<String>,
    val active: Boolean,
)

/** An admin catalog entry of one business type and audience (`GET /catalog/services?businessType=&gender=`, §5.19). */
data class CatalogService(val id: String, val name: String, val description: String, val imageUrl: String, val kind: BusinessKind)

/** The editable part of a service (PRD M16 form); [mediaKeys] null = media unchanged. */
data class ServiceDraft(
    val price: String = "",
    val durationMinutes: String = "",
    val brideOnly: Boolean = false,
    val description: String = "",
    val mediaKeys: List<String>? = null,
    val active: Boolean = true,
)

enum class ServiceField { PRICE, DURATION, DESCRIPTION, MEDIA }

object ServiceLimits {
    const val DURATION_STEP = 5
    const val DURATION_MIN = 5
    const val DURATION_MAX = 1_440
    const val DESCRIPTION_MAX = 500
    const val MEDIA_MAX = 10
    const val PRICE_DECIMALS = 2
    const val PAGE_SIZE = 50
}

private const val DECIMAL_POINT = '.'
private const val ARABIC_DECIMAL = '٫'
private const val ARABIC_ZERO = '٠'
private const val ASCII_ZERO = '0'
private const val DIGITS = 10

/** Whole part and decimals. */
private const val PRICE_PARTS = 2

/** Arabic-Indic digits and the Arabic decimal mark become ASCII; anything else is dropped. */
fun normalizeNumber(raw: String): String = buildString {
    raw.trim().forEach { ch ->
        when {
            ch.isDigit() && ch in ARABIC_ZERO..(ARABIC_ZERO + DIGITS - 1) -> append(ASCII_ZERO + (ch - ARABIC_ZERO))
            ch in ASCII_ZERO..(ASCII_ZERO + DIGITS - 1) -> append(ch)
            ch == DECIMAL_POINT || ch == ARABIC_DECIMAL -> append(DECIMAL_POINT)
        }
    }
}

/** PRD M16: price > 0 with at most 2 decimals; duration a multiple of 5 within 5..1440; description ≤ 500; ≤ 10 media. */
fun serviceErrors(draft: ServiceDraft): Set<ServiceField> = buildSet {
    if (!isValidPrice(normalizeNumber(draft.price))) add(ServiceField.PRICE)
    if (!isValidDuration(normalizeNumber(draft.durationMinutes).toIntOrNull())) add(ServiceField.DURATION)
    if (draft.description.trim().length > ServiceLimits.DESCRIPTION_MAX) add(ServiceField.DESCRIPTION)
    if ((draft.mediaKeys?.size ?: 0) > ServiceLimits.MEDIA_MAX) add(ServiceField.MEDIA)
}

private fun isValidPrice(price: String): Boolean {
    val value = price.toDoubleOrNull() ?: return false
    val parts = price.split(DECIMAL_POINT)
    val decimals = parts.getOrNull(1)?.length ?: 0
    return value > 0.0 && parts.size <= PRICE_PARTS && decimals <= ServiceLimits.PRICE_DECIMALS
}

private fun isValidDuration(minutes: Int?): Boolean =
    minutes != null && minutes in ServiceLimits.DURATION_MIN..ServiceLimits.DURATION_MAX && minutes % ServiceLimits.DURATION_STEP == 0

/** Drops a trailing ".000" style tail so the field shows "12.5" for the server's "12.500". */
fun priceForEditing(serverPrice: String): String {
    if (!serverPrice.contains(DECIMAL_POINT)) return serverPrice
    return serverPrice.trimEnd(ASCII_ZERO).trimEnd(DECIMAL_POINT)
}

fun SalonService.toDraft(): ServiceDraft = ServiceDraft(
    price = priceForEditing(price),
    durationMinutes = durationMinutes.toString(),
    brideOnly = brideOnly,
    description = extraDescription.orEmpty(),
    active = active,
)

/** Client-side search over loaded rows (the contract has no query parameter). */
fun <T> List<T>.matching(query: String, name: (T) -> String): List<T> {
    val text = query.trim()
    return if (text.isEmpty()) this else filter { name(it).contains(text, ignoreCase = true) }
}

/** `/salon/services` and the catalog (SERVICES_MANAGE). Loaded rows are kept for the form screens. */
interface ServicesRepository {
    /** Every saved service (create, edit, on/off) so open lists update without reloading. */
    val changes: Flow<SalonService>

    /** [branchId] null = salon-level (the member's own branch / the main branch); else that branch (MER-064, owner). */
    suspend fun services(branchId: String? = null): AppResult<List<SalonService>>

    /** Only the catalog of the business's own type that fits its audience (BUSINESS_DOMAIN §5.19). */
    suspend fun catalog(kind: BusinessKind, page: Int): AppResult<List<CatalogService>>

    fun cachedService(id: String): SalonService?

    fun cachedCatalog(id: String): CatalogService?

    suspend fun create(catalogId: String, draft: ServiceDraft, branchId: String? = null): AppResult<SalonService>

    suspend fun update(id: String, draft: ServiceDraft, branchId: String? = null): AppResult<SalonService>

    suspend fun setActive(id: String, active: Boolean, branchId: String? = null): AppResult<SalonService>
}
