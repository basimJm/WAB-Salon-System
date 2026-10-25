package com.fab.wab.merchant.feature.bookings.data.repository

import com.fab.wab.merchant.core.domain.policy.FullPaymentRefund
import com.fab.wab.merchant.core.domain.policy.NoShowDeposit
import com.fab.wab.merchant.core.domain.policy.NoShowFullPayment
import com.fab.wab.merchant.core.domain.policy.PaymentOption
import com.fab.wab.merchant.core.domain.policy.PolicyTerms
import com.fab.wab.merchant.core.domain.policy.enumOfCode
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull

/** Keys of the booking's `policy` snapshot (= the salon policy at booking time, `GET /salon/policy` shape). */
internal object PolicySnapshotKeys {
    const val WINDOW_HOURS = "cancellationWindowHours"
    const val PAYMENT_OPTIONS = "paymentOptions"
    const val DEPOSIT_PERCENTAGE = "depositPercentage"
    const val DEPOSIT_REFUNDABLE = "depositRefundableOnCustomerCancel"
    const val FULL_REFUND = "fullPaymentRefundOnCustomerCancel"
    const val NO_SHOW_DEPOSIT = "noShowDeposit"
    const val NO_SHOW_FULL = "noShowFullPayment"
}

/**
 * The snapshot as policy terms (MER-054: the real snapshot mixes numbers, booleans, codes and an array, so listing raw
 * values showed "12", "true", "KEEP" on M09). Null when the snapshot is empty (older bookings).
 */
fun JsonObject.toPolicyTerms(): PolicyTerms? {
    if (isEmpty()) return null
    return PolicyTerms(
        windowHours = number(PolicySnapshotKeys.WINDOW_HOURS),
        options = (this[PolicySnapshotKeys.PAYMENT_OPTIONS] as? JsonArray).orEmpty()
            .mapNotNull { enumOfCode<PaymentOption>((it as? JsonPrimitive)?.content) }.toSet(),
        depositPercentage = number(PolicySnapshotKeys.DEPOSIT_PERCENTAGE),
        depositRefundable = (this[PolicySnapshotKeys.DEPOSIT_REFUNDABLE] as? JsonPrimitive)?.booleanOrNull,
        fullRefund = enumOfCode<FullPaymentRefund>(code(PolicySnapshotKeys.FULL_REFUND)),
        noShowDeposit = enumOfCode<NoShowDeposit>(code(PolicySnapshotKeys.NO_SHOW_DEPOSIT)),
        noShowFull = enumOfCode<NoShowFullPayment>(code(PolicySnapshotKeys.NO_SHOW_FULL)),
    )
}

private fun JsonObject.number(key: String): Int? = (this[key] as? JsonPrimitive)?.doubleOrNull?.toInt()

private fun JsonObject.code(key: String): String? = (this[key] as? JsonPrimitive)?.takeIf { it.isString }?.content
