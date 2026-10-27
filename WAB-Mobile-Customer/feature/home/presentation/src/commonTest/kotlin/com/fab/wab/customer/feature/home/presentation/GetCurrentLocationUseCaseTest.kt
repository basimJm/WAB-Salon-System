package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GetCurrentLocationUseCaseTest {
    @Test
    fun returnsTheProvidersFix() = runTest {
        val fix = LocationData(latitude = 31.95, longitude = 35.91)
        val provider = object : DeviceLocationProvider {
            override suspend fun currentLocation(): LocationData? = fix
        }
        assertEquals(fix, GetCurrentLocationUseCase(provider)())
    }

    @Test
    fun aFixThatNeverComesTimesOutAndCancelsTheRequest() = runTest {
        var cancelled = false
        val provider = object : DeviceLocationProvider {
            override suspend fun currentLocation(): LocationData? = try {
                awaitCancellation()
            } finally {
                cancelled = true
            }
        }
        assertNull(GetCurrentLocationUseCase(provider, timeoutMs = TIMEOUT_MS)())
        assertTrue(cancelled, "the platform request is stopped, not leaked")
    }

    private companion object {
        const val TIMEOUT_MS = 50L
    }
}
