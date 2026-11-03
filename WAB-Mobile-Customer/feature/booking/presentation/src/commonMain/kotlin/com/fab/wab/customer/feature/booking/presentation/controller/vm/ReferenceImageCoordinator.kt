package com.fab.wab.customer.feature.booking.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsAction
import com.fab.wab.customer.core.analytics.analyticsParams
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.ui.media.ImageSource
import com.fab.wab.customer.core.ui.media.PickResult
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.domain.model.DraftReferenceImage
import com.fab.wab.customer.feature.booking.presentation.analytics.BookingAnalytics
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.SideEffect
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

/**
 * Tattoo design image of the current person (BUSINESS_DOMAIN §5.23): gallery pick (the picker already compresses to
 * JPEG), presigned upload with purpose `BOOKING_REFERENCE`, then the key is kept on the person for the draft.
 * Only a tattoo studio takes it; a pick for another business type does nothing.
 */
internal class ReferenceImageCoordinator(
    private val deps: BookingFlowDependencies,
    private val scope: () -> CoroutineScope,
    private val state: () -> UiState,
    private val update: (UiState.() -> UiState) -> Unit,
    private val effect: (SideEffect) -> Unit,
) {
    fun pick() {
        val current = state()
        if (!current.allowsReference || current.referenceUploading) return
        val person = current.currentPerson
        track(BookingAnalytics.VALUE_ADD)
        scope().launch {
            val image = when (val result = deps.imagePicker.pick(ImageSource.GALLERY)) {
                is PickResult.Picked -> result.image
                else -> {
                    deps.pickText(result)?.let { effect(SideEffect.ShowError(it)) }
                    return@launch
                }
            }
            update { copy(referenceUploading = true) }
            when (val upload = deps.uploadReference(image.bytes, image.contentType)) {
                is AppResult.Success -> update {
                    withPerson(person) { copy(referenceImage = DraftReferenceImage(upload.data, image.bytes)) }
                }
                is AppResult.Error -> effect(SideEffect.ShowError(deps.errorText(upload.appError)))
                AppResult.Loading -> Unit
            }
            update { copy(referenceUploading = false) }
        }
    }

    fun remove() {
        if (state().person.referenceImage == null) return
        track(BookingAnalytics.VALUE_REMOVE)
        update { withPerson(currentPerson) { copy(referenceImage = null) } }
    }

    private fun track(value: String) {
        val params = analyticsParams { text(BookingAnalytics.PARAM_VALUE, value) }
        deps.analytics.trackAction(AnalyticsAction(BookingAnalytics.ACTION_REFERENCE_IMAGE, params))
    }
}

/** The state with person [index] transformed (the person index stays fixed while an upload runs). */
internal fun UiState.withPerson(index: Int, transform: DraftPerson.() -> DraftPerson): UiState =
    copy(persons = persons.mapIndexed { i, p -> if (i == index) p.transform() else p })
