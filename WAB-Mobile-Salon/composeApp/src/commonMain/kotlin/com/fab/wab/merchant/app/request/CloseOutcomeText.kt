package com.fab.wab.merchant.app.request

import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.close_already
import com.fab.wab.merchant.app.resources.close_completed
import com.fab.wab.merchant.app.resources.close_done_completed
import com.fab.wab.merchant.app.resources.close_done_no_show
import com.fab.wab.merchant.app.resources.close_no_show
import com.fab.wab.merchant.app.resources.close_open
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseAction
import com.fab.wab.merchant.feature.bookings.domain.usecase.CloseOutcome
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.getString

/** The line that replaces a close reminder after Completed / No-show was tapped on it. */
suspend fun closeOutcomeText(outcome: CloseOutcome): String = getString(closeOutcomeResource(outcome))

internal fun closeOutcomeResource(outcome: CloseOutcome): StringResource = when (outcome) {
    is CloseOutcome.Done -> if (outcome.action == CloseAction.COMPLETED) Res.string.close_done_completed else Res.string.close_done_no_show
    CloseOutcome.AlreadyClosed -> Res.string.close_already
    CloseOutcome.OpenDetails -> Res.string.close_open
}

/** The button title of a close action. */
internal fun closeActionTitle(action: CloseAction): StringResource = when (action) {
    CloseAction.COMPLETED -> Res.string.close_completed
    CloseAction.NO_SHOW -> Res.string.close_no_show
}
