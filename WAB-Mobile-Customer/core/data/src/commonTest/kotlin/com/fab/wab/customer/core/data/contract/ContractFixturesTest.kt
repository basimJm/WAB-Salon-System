package com.fab.wab.customer.core.data.contract

import com.fab.wab.customer.core.data.BaseResponse
import com.fab.wab.customer.core.data.contract.generated.ContractDecoders
import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.MockFixtures
import com.fab.wab.customer.core.data.mock.fixtureKeyOf
import com.fab.wab.customer.core.data.mock.localizeFixture
import com.fab.wab.customer.core.network.client.NetworkJson
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * CUS-060: every fixture (real responses captured from the dev API / local stack, schema samples otherwise) decodes
 * with the app's generated DTOs and the app's JSON settings, so a server shape change fails here before a screen breaks.
 */
class ContractFixturesTest {

    private val json = NetworkJson.json

    /** Every operation a repository calls (`grep CustomerOperations.` in feature + core data code). */
    private val appOperations = listOf(
        CustomerOperations.getConfig, CustomerOperations.getLocationsCountries, CustomerOperations.getLocationsCities,
        CustomerOperations.getLocationsAreas, CustomerOperations.getContentPagesBySlug, CustomerOperations.getContentFaqs,
        CustomerOperations.getCatalogServices, CustomerOperations.getHome, CustomerOperations.getSalons,
        CustomerOperations.getSalonsFilters, CustomerOperations.getSalonsBySalonId, CustomerOperations.getSalonsBySalonIdStaffByMemberId,
        CustomerOperations.getSalonsBySalonIdReviews, CustomerOperations.getSalonsBySalonIdStaffByMemberIdReviews,
        CustomerOperations.postSalonsBySalonIdReviews, CustomerOperations.postSalonsBySalonIdStaffByMemberIdReviews,
        CustomerOperations.getFavorites, CustomerOperations.putFavoritesBySalonId, CustomerOperations.deleteFavoritesBySalonId,
        CustomerOperations.postAuthCheckPhone, CustomerOperations.postAuthOtpRequest, CustomerOperations.postAuthOtpVerify,
        CustomerOperations.postAuthLogin, CustomerOperations.postAuthRegister, CustomerOperations.postAuthChangePhone,
        CustomerOperations.postAuthLogout, CustomerOperations.postAuthRefresh, CustomerOperations.putInstallations,
        CustomerOperations.patchInstallationsPushEnabled, CustomerOperations.getProfile, CustomerOperations.patchProfile,
        CustomerOperations.deleteProfile, CustomerOperations.putProfileAvatar, CustomerOperations.deleteProfileAvatar,
        CustomerOperations.postUploadsPresign, CustomerOperations.postUploadsConfirm,
        CustomerOperations.postSalonsBySalonIdAvailability, CustomerOperations.postBookingsDrafts,
        CustomerOperations.getBookingsDraftsById, CustomerOperations.deleteBookingsDraftsById,
        CustomerOperations.postBookingsDraftsByIdVerifyOtp, CustomerOperations.postBookings, CustomerOperations.getBookings,
        CustomerOperations.getBookingsById, CustomerOperations.postBookingsByIdCancel, CustomerOperations.getNotifications,
        CustomerOperations.getNotificationsUnreadCount, CustomerOperations.postNotificationsRead,
    ).map(::fixtureKeyOf)

    @Test
    fun everyFixtureDecodesWithTheGeneratedDtos() {
        assertEquals(MockFixtures.byOperationId.keys, ContractDecoders.byOperationId.keys)
        MockFixtures.byOperationId.forEach { (operation, fixture) ->
            val decoder = ContractDecoders.byOperationId.getValue(operation)
            val envelope = runCatching {
                json.decodeFromString(BaseResponse.serializer(JsonElement.serializer()), localizeFixture(fixture, LANGUAGE))
            }.getOrElse { fail("$operation: envelope does not decode: ${it.message}") }
            assertTrue(envelope.success, operation)
            runCatching { json.decodeFromJsonElement(decoder, envelope.data) }
                .onFailure { fail("$operation: data does not decode with the generated DTO: ${it.message}") }
        }
    }

    @Test
    fun everyOperationTheAppCallsHasARealCapturedResponse() {
        val notCaptured = appOperations.filterNot { it in MockFixtures.captured }.toSet()
        // A profile picture needs a real image upload to the storage before confirm/avatar; their schema samples stay.
        // The WhatsApp OTP request / verify were captured with contract 1.5.0 (CUS-093).
        val expected = setOf(
            CustomerOperations.postUploadsConfirm,
            CustomerOperations.putProfileAvatar,
        ).map(::fixtureKeyOf).toSet()
        assertEquals(expected, notCaptured)
    }

    @Test
    fun paginatedRealResponsesCarryMeta() {
        val paginated = listOf(
            CustomerOperations.getSalons,
            CustomerOperations.getBookings,
            CustomerOperations.getNotifications,
            CustomerOperations.getFavorites,
        )
        paginated.map(::fixtureKeyOf)
            .forEach { operation ->
                val fixture = MockFixtures.byOperationId.getValue(operation)
                val envelope = json.decodeFromString(BaseResponse.serializer(JsonElement.serializer()), fixture)
                val meta = envelope.meta ?: fail("$operation: no pagination meta")
                assertTrue(meta.pageSize > 0 && meta.page >= 1, operation)
                assertTrue(envelope.data != JsonNull, operation)
            }
    }

    private companion object {
        const val LANGUAGE = "en"
    }
}
