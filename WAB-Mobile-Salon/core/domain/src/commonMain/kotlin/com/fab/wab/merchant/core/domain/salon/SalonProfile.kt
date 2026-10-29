package com.fab.wab.merchant.core.domain.salon

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.model.LocationData
import com.fab.wab.merchant.core.domain.session.SalonState
import kotlinx.coroutines.flow.StateFlow

/** What the server still misses before the salon can go LIVE (PRD §4.2 profile completeness). */
enum class CompletenessItem {
    COVER,
    PROFILE_IMAGE,
    NAME,
    DESCRIPTION,
    LOCATION,
    PHONE,
    WORKING_HOURS,
    SERVICE,
    STAFF,
    POLICY,
    ;

    companion object {
        fun fromCode(code: String?): CompletenessItem? = entries.firstOrNull { it.name == code }
    }
}

/** `GET /salon`: the salon as its members manage it (PRD M12, M13; state for the launch router). */
data class SalonProfile(
    val id: String,
    val name: String,
    val businessType: BusinessType,
    val audience: Audience,
    val state: SalonState,
    val description: String?,
    val coverUrl: String?,
    val profileUrl: String?,
    val coverKey: String? = null,
    val profileKey: String? = null,
    val location: LocationData?,
    val locationText: String?,
    val cityId: String?,
    val areaId: String?,
    val phone: String?,
    val whatsapp: String?,
    val missing: Set<CompletenessItem>,
    val ratingAverage: Double,
    val ratingCount: Int,
) {
    val isComplete: Boolean get() = missing.isEmpty()
    val kind: BusinessKind get() = BusinessKind(businessType, audience)
}

/** One shared source for the current salon: refreshed at launch, by Home / hub pull-to-refresh and after edits. */
interface SalonRepository {
    val current: StateFlow<SalonProfile?>

    /** Loads `GET /salon`, caches it and stores the salon state in the session. */
    suspend fun refresh(): AppResult<SalonProfile>
}

/** The cached salon's type + audience, else one `GET /salon`; null when it cannot be read. */
suspend fun SalonRepository.currentKind(): BusinessKind? = current.value?.kind ?: (refresh() as? AppResult.Success)?.data?.kind
