package com.fab.wab.merchant.core.domain.policy

enum class PaymentOption { PAY_ON_ARRIVAL, DEPOSIT, FULL_ONLINE }

/** Full online payment, customer cancels within the window. */
enum class FullPaymentRefund { FULL, MINUS_DEPOSIT }

enum class NoShowDeposit { KEEP, REFUND }

enum class NoShowFullPayment { KEEP, REFUND_MINUS_DEPOSIT, REFUND_FULL }

/**
 * The cancellation / payment terms of a salon policy: the policy being edited (M19 preview) or the snapshot a booking
 * carries (M09, BUSINESS_DOMAIN §3.5 `policySnapshot`). Null / unknown fields leave their line out.
 */
data class PolicyTerms(
    val windowHours: Int?,
    val options: Set<PaymentOption>,
    val depositPercentage: Int?,
    val depositRefundable: Boolean?,
    val fullRefund: FullPaymentRefund?,
    val noShowDeposit: NoShowDeposit?,
    val noShowFull: NoShowFullPayment?,
)

/** One line of the customer "Salon rules" block (design 07 `pr`), also listed in the booking details (M09). */
sealed interface PolicyRule {
    data class Window(val hours: Int) : PolicyRule
    data object PayOnArrival : PolicyRule
    data class Deposit(val percentage: Int) : PolicyRule
    data object FullOnline : PolicyRule
    data class DepositOnCancel(val refundable: Boolean) : PolicyRule
    data class FullOnCancel(val refund: FullPaymentRefund) : PolicyRule
    data class DepositOnNoShow(val outcome: NoShowDeposit) : PolicyRule
    data class FullOnNoShow(val outcome: NoShowFullPayment) : PolicyRule
}

/** The rules a customer sees; deposit / full-payment lines only when that option is offered. */
fun PolicyTerms.customerRules(): List<PolicyRule> = buildList {
    windowHours?.let { add(PolicyRule.Window(it)) }
    if (PaymentOption.PAY_ON_ARRIVAL in options) add(PolicyRule.PayOnArrival)
    val deposit = PaymentOption.DEPOSIT in options
    val full = PaymentOption.FULL_ONLINE in options
    if (deposit) depositPercentage?.let { add(PolicyRule.Deposit(it)) }
    if (full) add(PolicyRule.FullOnline)
    if (deposit) depositRefundable?.let { add(PolicyRule.DepositOnCancel(it)) }
    if (full) fullRefund?.let { add(PolicyRule.FullOnCancel(it)) }
    if (deposit) noShowDeposit?.let { add(PolicyRule.DepositOnNoShow(it)) }
    if (full) noShowFull?.let { add(PolicyRule.FullOnNoShow(it)) }
}

/** Tolerant code → enum (an unknown server code drops the line instead of failing the screen). */
inline fun <reified E : Enum<E>> enumOfCode(code: String?): E? = enumValues<E>().firstOrNull { it.name == code }
