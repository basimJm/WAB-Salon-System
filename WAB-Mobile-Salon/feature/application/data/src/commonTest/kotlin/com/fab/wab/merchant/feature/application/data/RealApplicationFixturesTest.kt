package com.fab.wab.merchant.feature.application.data

import com.fab.wab.merchant.core.data.contract.generated.GetSalonApplicationData
import com.fab.wab.merchant.core.data.contract.generated.PostSalonApplicationsData
import com.fab.wab.merchant.core.data.mock.decodeFixture
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.feature.application.data.repository.toDomain
import kotlinx.serialization.serializer
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/** MER-054: the application mappers on responses captured from the local real stack (core/data/fixtures/remote). */
class RealApplicationFixturesTest {

    @Test
    fun applicationAndRegistrationMap() {
        assertNotNull(decodeFixture("GetSalonApplication", serializer<GetSalonApplicationData>()).data.toDomain())
        val registered = decodeFixture("PostSalonApplications", serializer<PostSalonApplicationsData>()).data
        assertEquals("APPLICATION_PENDING", registered.application.state)
        val session = registered.toDomain()
        // MER-068: the captured answer carries every MemberProfile field the 1.4.0 contract declares.
        assertEquals(MemberRole.OWNER, session.member.role)
        assertEquals(registered.member.salonId, session.member.salonId)
        assertEquals(registered.application.salonId, session.member.salonId)
        assertEquals(Permission.entries.map { it.name }.toSet(), session.permissions)
    }
}
