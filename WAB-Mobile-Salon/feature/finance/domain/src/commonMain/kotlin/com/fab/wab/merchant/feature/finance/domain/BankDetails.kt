package com.fab.wab.merchant.feature.finance.domain

import com.fab.wab.merchant.core.domain.AppResult

/** `GET /salon/payout-details` (owner only); the full IBAN never comes back. */
data class BankDetails(val bankName: String, val accountHolder: String, val ibanLast4: String)

data class BankDraft(val bankName: String = "", val accountHolder: String = "", val iban: String = "")

enum class BankField { BANK_NAME, HOLDER, IBAN }

object BankLimits {
    const val NAME_MAX = 80

    /** Jordanian IBANs (design 08: "starts with JO, 30 characters"). */
    const val JORDAN_PREFIX = "JO"
    const val JORDAN_LENGTH = 30

    internal const val CHECK_START = 4
    internal const val MOD = 97
    internal const val VALID_REMAINDER = 1
    internal const val LETTER_OFFSET = 10
    internal const val DECIMAL = 10
}

/** Spaces removed, upper case ("jo94 cbjo…" → "JO94CBJO…"). */
fun normalizeIban(raw: String): String = raw.filterNot { it.isWhitespace() }.uppercase()

/** ISO 13616: Jordanian prefix and length, then the mod-97 check on the rearranged digits. */
fun isValidIban(raw: String): Boolean {
    val iban = normalizeIban(raw)
    if (
        !iban.startsWith(BankLimits.JORDAN_PREFIX) ||
        iban.length != BankLimits.JORDAN_LENGTH ||
        !iban.all { it.isLetterOrDigit() }
    ) return false
    val rearranged = iban.drop(BankLimits.CHECK_START) + iban.take(BankLimits.CHECK_START)
    var remainder = 0
    rearranged.forEach { ch ->
        val value = if (ch.isDigit()) ch - '0' else ch - 'A' + BankLimits.LETTER_OFFSET
        value.toString().forEach { digit -> remainder = (remainder * BankLimits.DECIMAL + (digit - '0')) % BankLimits.MOD }
    }
    return remainder == BankLimits.VALID_REMAINDER
}

fun bankErrors(draft: BankDraft): Set<BankField> = buildSet {
    if (draft.bankName.trim().length !in 1..BankLimits.NAME_MAX) add(BankField.BANK_NAME)
    if (draft.accountHolder.trim().length !in 1..BankLimits.NAME_MAX) add(BankField.HOLDER)
    if (!isValidIban(draft.iban)) add(BankField.IBAN)
}

/** `/salon/payout-details` (owner, PAYOUT_DETAILS_MANAGE) and the owner's phone for the BANK_DETAILS OTP. */
interface BankRepository {
    suspend fun details(): AppResult<BankDetails?>

    /** [otpToken] = single-use proof of a fresh BANK_DETAILS WhatsApp OTP to the owner's phone. */
    suspend fun save(draft: BankDraft, otpToken: String): AppResult<BankDetails>

    /** E.164 phone of [memberId] (`GET /team/members/{id}`; the contract has no self profile). */
    suspend fun phoneOf(memberId: String): AppResult<String>
}
