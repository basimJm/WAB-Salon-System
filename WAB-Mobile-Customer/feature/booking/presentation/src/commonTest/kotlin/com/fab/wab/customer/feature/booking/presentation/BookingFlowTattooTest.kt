package com.fab.wab.customer.feature.booking.presentation

import com.fab.wab.customer.core.domain.salon.Audience
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.upload.UploadPurpose
import com.fab.wab.customer.core.ui.media.ImageSource
import com.fab.wab.customer.core.ui.media.PickResult
import com.fab.wab.customer.core.ui.media.PickedImage
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingStep
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** CUS-104 (BUSINESS_DOMAIN §5.23): one optional design image per person, only at a tattoo studio. */
@OptIn(ExperimentalCoroutinesApi::class)
class BookingFlowTattooTest : BookingFlowHarness() {

    private val studio = salon(Gender.FEMALE).copy(businessType = BusinessType.TATTOO, audience = Audience.BOTH)
    private val image = PickedImage(byteArrayOf(1, 2, 3), "image/jpeg")

    @Test
    fun aPickedImageIsUploadedAsABookingReferenceAndSentWithTheDraft() = runTest(UnconfinedTestDispatcher()) {
        picker.result = PickResult.Picked(image)
        val vm = viewModel(details = studio)
        assertTrue(vm.state.value.allowsReference)
        vm.onEvent(UiAction.OnReferencePick)
        assertEquals(listOf(ImageSource.GALLERY), picker.requests)
        assertEquals(listOf(UploadPurpose.BOOKING_REFERENCE), uploads.purposes)
        assertEquals("ref-1", vm.state.value.person.referenceImage?.key)
        assertFalse(vm.state.value.referenceUploading)

        vm.reachStaffStep()
        vm.onEvent(UiAction.OnAnyStaffSelect)
        vm.onEvent(UiAction.OnContinue)
        vm.onEvent(UiAction.OnJustMe)
        assertEquals(BookingStep.SUMMARY, vm.state.value.step)
        assertEquals("ref-1", drafts.sentPersons.last().single().referenceImage?.key)
    }

    @Test
    fun theImageCanBeRemovedAndCancellingThePickChangesNothing() = runTest(UnconfinedTestDispatcher()) {
        picker.result = PickResult.Picked(image)
        val vm = viewModel(details = studio)
        vm.onEvent(UiAction.OnReferencePick)
        vm.onEvent(UiAction.OnReferenceRemove)
        assertNull(vm.state.value.person.referenceImage)
        picker.result = PickResult.Cancelled
        vm.onEvent(UiAction.OnReferencePick)
        assertNull(vm.state.value.person.referenceImage)
        assertEquals(1, uploads.purposes.size, "a cancelled pick uploads nothing")
        assertTrue(effects.isEmpty())
    }

    @Test
    fun failedPickOrUploadShowsAnErrorAndKeepsNoImage() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(details = studio)
        picker.result = PickResult.Failed
        vm.onEvent(UiAction.OnReferencePick)
        assertEquals(SideEffect.ShowError("pick failed"), effects.last())
        picker.result = PickResult.Picked(image)
        uploads.fail = true
        vm.onEvent(UiAction.OnReferencePick)
        assertEquals(SideEffect.ShowError("error"), effects.last())
        assertNull(vm.state.value.person.referenceImage)
        assertFalse(vm.state.value.referenceUploading)
    }

    @Test
    fun otherBusinessTypesNeverOfferOrSendAnImage() = runTest(UnconfinedTestDispatcher()) {
        picker.result = PickResult.Picked(image)
        val vm = viewModel(details = salon(Gender.FEMALE).copy(businessType = BusinessType.CLINIC, audience = Audience.BOTH))
        assertFalse(vm.state.value.allowsReference)
        vm.onEvent(UiAction.OnReferencePick)
        assertTrue(picker.requests.isEmpty())
        assertNull(vm.state.value.person.referenceImage)
    }
}
