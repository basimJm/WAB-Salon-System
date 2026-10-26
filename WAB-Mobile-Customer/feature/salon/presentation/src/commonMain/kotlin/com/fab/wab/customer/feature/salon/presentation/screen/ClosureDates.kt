package com.fab.wab.customer.feature.salon.presentation.screen

import com.fab.wab.customer.core.common.TimeFormat
import com.fab.wab.customer.core.domain.salon.Closure

/** The dates of an upcoming closure as shown to the customer: "14/11/2026", or a range when it spans several days. */
internal data class ClosureDates(val from: String, val to: String?)

/** CUS-092: the box showed raw ISO dates and "X – X" for a one-day closure. */
internal fun closureDatesOf(closure: Closure): ClosureDates {
    val from = TimeFormat.isoDateText(closure.from) ?: closure.from
    val to = TimeFormat.isoDateText(closure.to) ?: closure.to
    return ClosureDates(from = from, to = to.takeIf { it.isNotBlank() && it != from })
}
