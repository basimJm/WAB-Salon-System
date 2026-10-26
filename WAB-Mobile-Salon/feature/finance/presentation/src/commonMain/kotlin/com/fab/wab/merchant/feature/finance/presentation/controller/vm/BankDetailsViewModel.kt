package com.fab.wab.merchant.feature.finance.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.finance.domain.BankLimits
import com.fab.wab.merchant.feature.finance.domain.BankRepository
import com.fab.wab.merchant.feature.finance.presentation.analytics.FinanceAnalytics
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract.SideEffect
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract.UiAction
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BankDetailsDependencies(
    val bank: BankRepository,
    val locations: LocationsRepository,
    val session: Flow<SessionState>,
    val pending: PendingOtpVerification,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)

/** "+962791234567" → ("JO", "791234567") using the longest matching dial code. */
fun splitPhone(e164: String, countries: List<Country>): Pair<String, String>? {
    val country = countries.filter { e164.startsWith(it.dialCode) }.maxByOrNull { it.dialCode.length } ?: return null
    return country.code to e164.removePrefix(country.dialCode)
}

/** PRD M22 bank details (owner): validate, verify the owner's phone with an OTP (BANK_DETAILS), then save. */
class BankDetailsViewModel(
    private val deps: BankDetailsDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(), testScope) {

    private var loaded = false

    /**
     * Loads once: `onStart` runs again when the screen comes back from the OTP screen, and a reload there would
     * replace the typed bank name and holder with the saved ones right before they are sent with the proof.
     */
    override fun onStart() {
        if (loaded) return
        loaded = true
        load()
    }

    override fun handle(event: UiAction) {
        when (event) {
            is UiAction.OnBankName -> updateState { copy(draft = draft.copy(bankName = event.value.take(BankLimits.NAME_MAX))) }
            is UiAction.OnHolder -> updateState { copy(draft = draft.copy(accountHolder = event.value.take(BankLimits.NAME_MAX))) }
            is UiAction.OnIban -> updateState { copy(draft = draft.copy(iban = event.value.take(IBAN_INPUT_MAX))) }
            UiAction.OnContinue -> verify()
            UiAction.OnResume -> if (uiState.value.awaitingOtp) finish()
            UiAction.OnRetry -> load()
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null) }
            when (val result = deps.bank.details()) {
                is AppResult.Success -> updateState {
                    copy(loading = false, saved = result.data, draft = draft.copy(
                        bankName = result.data?.bankName.orEmpty(),
                        accountHolder = result.data?.accountHolder.orEmpty(),
                    ))
                }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun verify() {
        val state = uiState.value
        if (state.working) return
        if (state.errors.isNotEmpty()) {
            updateState { copy(showErrors = true) }
            return
        }
        scope.launch {
            updateState { copy(working = true) }
            val memberId = (deps.session.first() as? SessionState.SignedIn)?.member?.id
            val phone = memberId?.let { deps.bank.phoneOf(it) }
            val countries = (deps.locations.countries() as? AppResult.Success)?.data.orEmpty()
            val split = (phone as? AppResult.Success)?.data?.let { splitPhone(it, countries) }
            updateState { copy(working = false) }
            when {
                split != null -> {
                    deps.pending.consume()
                    updateState { copy(awaitingOtp = true) }
                    emitSideEffect(SideEffect.VerifyPhone(split.first, split.second))
                }
                phone is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(phone.appError)))
                else -> emitSideEffect(SideEffect.ShowError(deps.errorText(AppError.UnknownError(PHONE_UNAVAILABLE))))
            }
        }
    }

    /** Back from the OTP screen: a BANK_DETAILS proof saves the details; no proof = the owner went back. */
    private fun finish() {
        val proof = deps.pending.consume()?.takeIf { it.purpose == AuthPurpose.BANK_DETAILS }
        updateState { copy(awaitingOtp = false) }
        proof ?: return
        scope.launch {
            updateState { copy(working = true) }
            val result = deps.bank.save(uiState.value.draft, proof.otpToken)
            updateState { copy(working = false) }
            when (result) {
                is AppResult.Success -> {
                    deps.analytics.trackAction(AnalyticsAction(FinanceAnalytics.ACTION_BANK_SAVE))
                    updateState { copy(saved = result.data, draft = draft.copy(iban = ""), showErrors = false) }
                    emitSideEffect(SideEffect.Saved)
                }
                is AppResult.Error -> emitSideEffect(SideEffect.ShowError(deps.errorText(result.appError)))
                AppResult.Loading -> Unit
            }
        }
    }

    private companion object {
        /** Room for spaces typed in a 30-character IBAN. */
        const val IBAN_INPUT_MAX = 40

        /** Diagnostic text (never shown; the error mapper shows the generic message). */
        const val PHONE_UNAVAILABLE = "owner phone not available"
    }
}
