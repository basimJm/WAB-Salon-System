package com.fab.wab.merchant.feature.application.data

import com.fab.wab.merchant.core.data.contract.generated.GetSalonApplicationData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.feature.application.data.repository.toDomain
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** MER-054: the application mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealApplicationFixturesTest {

    @Test
    fun applicationAndRegistrationMap() {
        assertNotNull(decodeFixture("GetSalonApplication", serializer<GetSalonApplicationData>()).data.toDomain())
        val registered = decodeFixture("PostSalonApplications", serializer<PostSalonApplicationsData>()).data
        assertEquals("APPLICATION_PENDING", registered.application.state)
        assertNotNull(registered.toDomain())
    }
}
