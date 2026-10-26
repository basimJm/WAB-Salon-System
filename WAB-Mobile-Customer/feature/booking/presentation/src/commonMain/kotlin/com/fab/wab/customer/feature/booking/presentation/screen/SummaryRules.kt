package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.runtime.Composable
import com.fab.wab.customer.feature.booking.domain.model.BookingDraft
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_window
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_approval
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_deposit
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_deposit_non_refundable
import com.fab.wab.customer.feature.booking.presentation.resources.booking_rules_deposit_refundable
import org.jetbrains.compose.resources.pluralStringResource
import org.jetbrains.compose.resources.stringResource

/** Design `rulesList` from the policy snapshot: window, deposit %, refund rule, approval note, then the salon's notes. */
@Composable
internal fun rulesOf(draft: BookingDraft): List<String> {
    val policy = draft.policy
    val refundRes = if (policy.depositRefundableOnCustomerCancel) {
        Res.string.booking_rules_deposit_refundable
    } else {
        Res.string.booking_rules_deposit_non_refundable
    }
    return listOfNotNull(
        policy.cancellationWindowHours.toInt().let { hours -> pluralStringResource(Res.plurals.booking_rules_window, hours, hours) },
        policy.depositPercentage?.let { stringResource(Res.string.booking_rules_deposit, it.toInt()) },
        policy.depositPercentage?.let { stringResource(refundRes) },
        stringResource(Res.string.booking_rules_approval),
        policy.notes?.takeIf { it.isNotBlank() },
    )
}
