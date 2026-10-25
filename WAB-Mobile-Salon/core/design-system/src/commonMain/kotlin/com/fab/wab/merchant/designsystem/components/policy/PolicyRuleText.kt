package com.fab.wab.merchant.designsystem.components.policy

import androidx.compose.runtime.Composable
import com.fab.wab.merchant.core.domain.policy.FullPaymentRefund
import com.fab.wab.merchant.core.domain.policy.NoShowDeposit
import com.fab.wab.merchant.core.domain.policy.NoShowFullPayment
import com.fab.wab.merchant.core.domain.policy.PolicyRule
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.policy_rule_arrival
import com.fab.wab.merchant.designsystem.resources.policy_rule_dep_no
import com.fab.wab.merchant.designsystem.resources.policy_rule_dep_yes
import com.fab.wab.merchant.designsystem.resources.policy_rule_deposit
import com.fab.wab.merchant.designsystem.resources.policy_rule_full
import com.fab.wab.merchant.designsystem.resources.policy_rule_full_full
import com.fab.wab.merchant.designsystem.resources.policy_rule_full_minus
import com.fab.wab.merchant.designsystem.resources.policy_rule_ns_full_full
import com.fab.wab.merchant.designsystem.resources.policy_rule_ns_full_keep
import com.fab.wab.merchant.designsystem.resources.policy_rule_ns_full_minus
import com.fab.wab.merchant.designsystem.resources.policy_rule_ns_keep
import com.fab.wab.merchant.designsystem.resources.policy_rule_ns_ref
import com.fab.wab.merchant.designsystem.resources.policy_rule_window
import org.jetbrains.compose.resources.stringResource

/** The customer-facing line of a policy rule (M19 preview, M09 snapshotted policy). */
@Composable
fun policyRuleText(rule: PolicyRule): String = when (rule) {
    is PolicyRule.Window -> stringResource(Res.string.policy_rule_window, rule.hours)
    PolicyRule.PayOnArrival -> stringResource(Res.string.policy_rule_arrival)
    is PolicyRule.Deposit -> stringResource(Res.string.policy_rule_deposit, rule.percentage)
    PolicyRule.FullOnline -> stringResource(Res.string.policy_rule_full)
    is PolicyRule.DepositOnCancel -> stringResource(
        if (rule.refundable) Res.string.policy_rule_dep_yes else Res.string.policy_rule_dep_no,
    )
    is PolicyRule.FullOnCancel -> stringResource(
        if (rule.refund == FullPaymentRefund.FULL) Res.string.policy_rule_full_full else Res.string.policy_rule_full_minus,
    )
    is PolicyRule.DepositOnNoShow -> stringResource(
        if (rule.outcome == NoShowDeposit.KEEP) Res.string.policy_rule_ns_keep else Res.string.policy_rule_ns_ref,
    )
    is PolicyRule.FullOnNoShow -> stringResource(
        when (rule.outcome) {
            NoShowFullPayment.KEEP -> Res.string.policy_rule_ns_full_keep
            NoShowFullPayment.REFUND_MINUS_DEPOSIT -> Res.string.policy_rule_ns_full_minus
            NoShowFullPayment.REFUND_FULL -> Res.string.policy_rule_ns_full_full
        },
    )
}
