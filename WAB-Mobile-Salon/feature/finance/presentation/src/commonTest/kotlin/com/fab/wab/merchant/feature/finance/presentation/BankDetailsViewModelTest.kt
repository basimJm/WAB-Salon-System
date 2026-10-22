package com.fab.wab.merchant.feature.finance.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.finance.domain.BankDetails
import com.fab.wab.merchant.feature.finance.domain.BankDraft
import com.fab.wab.merchant.feature.finance.domain.BankField
import com.fab.wab.merchant.feature.finance.domain.BankRepository
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract.SideEffect
import com.fab.wab.merchant.feature.finance.presentation.controller.contract.BankDetailsContract.UiAction
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.BankDetailsDependencies
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.BankDetailsViewModel
import com.fab.wab.merchant.feature.finance.presentation.controller.vm.splitPhone
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val JORDAN = Country("JO", "Jordan", "+962", null, "^7[789]\\d{7}$")
private val US = Country("US", "USA", "+1", null, "^\\d{10}$")
private const val IBAN = "JO94CBJO0010000000000131000302"

private class FakeBank : BankRepository {
    val saved = mutableListOf<Pair<BankDraft, String>>()
    override suspend fun details(): AppResult<BankDetails?> = AppResult.Success(BankDetails("Arab Bank", "Lina", "0302"))
    override suspend fun save(draft: BankDraft, idToken: String): AppResult<BankDetails> {
        saved += draft to idToken
        return AppResult.Success(BankDetails(draft.bankName, draft.accountHolder, "0302"))
    }
    override suspend fun phoneOf(memberId: String): AppResult<String> = AppResult.Success("+962791234567")
}

private class FakeCountries : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(US, JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

@OptIn(ExperimentalCoroutinesApi::class)
class BankDetailsViewModelTest {

    private val bank = FakeBank()
    private val pending = PendingOtpVerification()

    private fun TestScope.viewModel() = BankDetailsViewModel(
        BankDetailsDependencies(bank, FakeCountries(), flowOf(SessionState.SignedIn(MemberProfile("owner", "s", "Huda", MemberRole.OWNER))), pending, NoOpAnalyticsTracker, { "failed" }),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun phoneSplitsOnTheLongestDialCode() {
        assertEquals("JO" to "791234567", splitPhone("+962791234567", listOf(US, JORDAN)))
        assertNull(splitPhone("+44123", listOf(JORDAN)))
    }

    @Test
    fun validatesThenVerifiesTheOwnerPhoneThenSavesWithTheProof() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        val loaded = viewModel.state.first { !it.loading }
        assertEquals("Arab Bank", loaded.draft.bankName)
        viewModel.onEvent(UiAction.OnContinue)
        assertEquals(setOf(BankField.IBAN), viewModel.state.first().visibleErrors)
        viewModel.onEvent(UiAction.OnIban("jo94 cbjo 0010 0000 0000 0131 0003 02"))
        viewModel.onEvent(UiAction.OnContinue)
        assertEquals(SideEffect.VerifyPhone("JO", "791234567"), effects.last())
        assertTrue(viewModel.state.first().awaitingOtp)
        pending.publish(OtpVerified(AuthPurpose.BANK_DETAILS, PhoneNumber("JO", "791234567"), "id-token"))
        viewModel.onEvent(UiAction.OnResume)
        assertEquals("id-token", bank.saved.single().second)
        assertEquals(SideEffect.Saved, effects.last())
        assertFalse(viewModel.state.first().awaitingOtp)
    }

    @Test
    fun backFromOtpWithoutProofSavesNothing() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnIban(IBAN))
        viewModel.onEvent(UiAction.OnContinue)
        pending.publish(OtpVerified(AuthPurpose.CHANGE_PHONE, PhoneNumber("JO", "791234567"), "other"))
        viewModel.onEvent(UiAction.OnResume)
        assertTrue(bank.saved.isEmpty())
        assertFalse(viewModel.state.first().awaitingOtp)
    }
}
