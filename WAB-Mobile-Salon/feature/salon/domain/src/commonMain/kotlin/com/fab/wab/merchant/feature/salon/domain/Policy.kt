package com.fab.wab.merchant.feature.salon.domain

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.policy.FullPaymentRefund
import com.fab.wab.merchant.core.domain.policy.NoShowDeposit
import com.fab.wab.merchant.core.domain.policy.NoShowFullPayment
import com.fab.wab.merchant.core.domain.policy.PaymentOption
import com.fab.wab.merchant.core.domain.policy.PolicyRule
import com.fab.wab.merchant.core.domain.policy.PolicyTerms
import com.fab.wab.merchant.core.domain.policy.customerRules

/** `GET /salon/policy` (null until the salon sets one). */
data class SalonPolicy(
    val windowHours: Int,
    val options: Set<PaymentOption>,
    val depositPercentage: Int?,
    val depositRefundable: Boolean,
    val fullRefund: FullPaymentRefund,
    val noShowDeposit: NoShowDeposit,
    val noShowFull: NoShowFullPayment,
    val notes: String,
)

data class PolicyDraft(
    val windowHours: String = PolicyLimits.DEFAULT_WINDOW.toString(),
    val options: Set<PaymentOption> = setOf(PaymentOption.PAY_ON_ARRIVAL),
    val depositPercentage: String = "",
    val depositRefundable: Boolean = true,
    val fullRefund: FullPaymentRefund = FullPaymentRefund.FULL,
    val noShowDeposit: NoShowDeposit = NoShowDeposit.KEEP,
    val noShowFull: NoShowFullPayment = NoShowFullPayment.KEEP,
    val notes: String = "",
)

enum class PolicyField { WINDOW, OPTIONS, DEPOSIT, NOTES }

object PolicyLimits {
    const val WINDOW_MIN = 1
    const val WINDOW_MAX = 720
    const val DEFAULT_WINDOW = 24
    const val DEPOSIT_MIN = 1
    const val DEPOSIT_MAX = 100
    const val NOTES_MAX = 1_000

    private const val ONE_HOUR = 1
    private const val TWO_HOURS = 2
    private const val THREE_HOURS = 3
    private const val SIX_HOURS = 6
    private const val HALF_DAY = 12
    private const val ONE_DAY = 24
    private const val TWO_DAYS = 48

    /** Window chips of PRD M19 / the design; anything else is "custom". */
    val WINDOW_PRESETS: List<Int> = listOf(ONE_HOUR, TWO_HOURS, THREE_HOURS, SIX_HOURS, HALF_DAY, ONE_DAY, TWO_DAYS)

    /** The live example's booking value (design: "On a 50 JOD booking…"), in fils. */
    const val EXAMPLE_BOOKING_FILS = 50_000L
    const val PERCENT = 100
}

fun SalonPolicy.toDraft(): PolicyDraft = PolicyDraft(
    windowHours = windowHours.toString(),
    options = options,
    depositPercentage = depositPercentage?.toString().orEmpty(),
    depositRefundable = depositRefundable,
    fullRefund = fullRefund,
    noShowDeposit = noShowDeposit,
    noShowFull = noShowFull,
    notes = notes,
)

/** PRD M19: window required, ≥ 1 payment option, deposit 1..100 when DEPOSIT is offered, notes ≤ 1000. */
fun policyErrors(draft: PolicyDraft): Set<PolicyField> = buildSet {
    if (draft.windowHours.trim().toIntOrNull()?.let {
        it in PolicyLimits.WINDOW_MIN..PolicyLimits.WINDOW_MAX
    } != true) add(PolicyField.WINDOW)
    if (draft.options.isEmpty()) add(PolicyField.OPTIONS)
    if (PaymentOption.DEPOSIT in draft.options &&
        draft.depositPercentage.trim().toIntOrNull()?.let { it in PolicyLimits.DEPOSIT_MIN..PolicyLimits.DEPOSIT_MAX } != true
    ) {
        add(PolicyField.DEPOSIT)
    }
    if (draft.notes.trim().length > PolicyLimits.NOTES_MAX) add(PolicyField.NOTES)
}

/** The deposit of the 50 JOD example in fils (integer, as all money), or null while the percentage is invalid. */
fun depositExampleFils(percentage: String): Long? {
    val pct = percentage.trim().toIntOrNull()?.takeIf { it in PolicyLimits.DEPOSIT_MIN..PolicyLimits.DEPOSIT_MAX } ?: return null
    return PolicyLimits.EXAMPLE_BOOKING_FILS * pct / PolicyLimits.PERCENT
}

/** The rules a customer sees for [draft] (shared with the booking details, core `PolicyTerms`). */
fun customerRules(draft: PolicyDraft): List<PolicyRule> = PolicyTerms(
    windowHours = draft.windowHours.trim().toIntOrNull(),
    options = draft.options,
    depositPercentage = draft.depositPercentage.trim().toIntOrNull(),
    depositRefundable = draft.depositRefundable,
    fullRefund = draft.fullRefund,
    noShowDeposit = draft.noShowDeposit,
    noShowFull = draft.noShowFull,
).customerRules()

/** `GET/PUT /salon/policy` (POLICIES_MANAGE). */
interface PolicyRepository {
    suspend fun policy(): AppResult<SalonPolicy?>

    suspend fun save(draft: PolicyDraft): AppResult<SalonPolicy>
}
