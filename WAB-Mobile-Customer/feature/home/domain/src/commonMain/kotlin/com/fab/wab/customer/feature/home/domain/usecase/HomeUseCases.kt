package com.fab.wab.customer.feature.home.domain.usecase

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.repository.HomeRepository
import kotlinx.coroutines.withTimeoutOrNull

object HomeDefaults {
    /** A fix that takes longer than this is skipped: Home loads without the nearest section rather than hanging. */
    const val LOCATION_TIMEOUT_MS = 10_000L
}

class LoadHomeUseCase(private val repository: HomeRepository) {
    suspend operator fun invoke(gender: Gender, lens: BusinessType?, location: LocationData?): AppResult<HomeContent> =
        repository.load(gender, lens, location)
}

/** One current fix from the device; the caller must have checked the permission and the location service first. */
class GetCurrentLocationUseCase(
    private val provider: DeviceLocationProvider,
    private val timeoutMs: Long = HomeDefaults.LOCATION_TIMEOUT_MS,
) {
    suspend operator fun invoke(): LocationData? = withTimeoutOrNull(timeoutMs) { provider.currentLocation() }
}
