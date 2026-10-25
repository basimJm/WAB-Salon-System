package com.fab.wab.merchant.core.data.branch

import com.fab.wab.merchant.core.data.BaseResponse
import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdData
import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdDataCompleteness
import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdDataName
import com.fab.wab.merchant.core.data.contract.generated.GetBranchesByBranchIdDataOffline
import com.fab.wab.merchant.core.data.mock.localizeFixture
import com.fab.wab.merchant.core.domain.branch.BranchForm
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.model.LocationData
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** MER-062: `BranchView` → domain, create / patch bodies, the mock branch list. */
class BranchesMapperTest {
    private val dto = GetBranchesByBranchIdData(
        id = "b1", name = GetBranchesByBranchIdDataName("خلدا", "Khalda"), isMain = false, status = "OFFLINE", locationText = " ",
        phone = "+962791111111", whatsapp = "", weeklySchedule = emptyList(), offline = GetBranchesByBranchIdDataOffline("Renovation", "x"),
        completeness = GetBranchesByBranchIdDataCompleteness(listOf("SERVICE"), false),
    )
    private val form = BranchForm("مكة", " Mecca ", LocationData(31.9, 35.8), "St 1", "c1", "a1", "+962 79 123 4567", "")

    @Test
    fun viewMapsStatusTextsAndCompleteness() {
        val branch = dto.toDomain()
        assertEquals(BranchStatus.OFFLINE, branch.status)
        assertEquals("Khalda", branch.name.en)
        assertNull(branch.locationText)
        assertNull(branch.whatsapp)
        assertEquals("Renovation", branch.offlineReason)
        assertEquals(listOf("SERVICE"), branch.missing)
    }

    @Test
    fun createBodyTrimsAndNormalizesAndNeedsEveryRequiredField() {
        val body = form.toCreateBody()
        assertEquals("Mecca", body?.name?.en)
        assertEquals("+962791234567", body?.phone)
        assertNull(body?.whatsapp)
        assertNull(form.copy(location = null).toCreateBody())
        assertNull(form.copy(areaId = null).toCreateBody())
    }

    @Test
    fun patchBodyClearsWhatsappExplicitly() {
        val body = form.toPatchBody()
        assertEquals(JsonNull, body["whatsapp"])
        assertEquals("Mecca", (body["name"] as JsonObject)["en"]?.jsonPrimitive?.content)
        assertEquals("+962791234567", body["phone"]?.jsonPrimitive?.content)
    }

    @Test
    fun mockListDecodesWithMainFirst() {
        val json = Json { ignoreUnknownKeys = true }
        val response = json.decodeFromString<BaseResponse<List<GetBranchesByBranchIdData>>>(localizeFixture(mockBranchesFixture.json, "en"))
        val branches = response.data.map { it.toDomain() }
        assertEquals(3, branches.size)
        assertTrue(branches.first().isMain)
        assertEquals(BranchStatus.OFFLINE, branches.last().status)
    }
}
