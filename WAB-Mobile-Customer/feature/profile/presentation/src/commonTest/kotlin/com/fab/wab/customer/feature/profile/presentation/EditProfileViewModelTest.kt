package com.fab.wab.customer.feature.profile.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.locations.Area
import com.fab.wab.customer.core.domain.locations.City
import com.fab.wab.customer.core.domain.locations.Country
import com.fab.wab.customer.core.domain.locations.LocationsRepository
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.OtpVerified
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.customer.feature.auth.domain.usecase.ChangePhoneUseCase
import com.fab.wab.customer.feature.profile.domain.model.ProfileUpdate
import com.fab.wab.customer.feature.profile.domain.usecase.LoadProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UpdateProfileUseCase
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.SideEffect
import com.fab.wab.customer.feature.profile.presentation.controller.contract.EditProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.vm.EditProfileDependencies
import com.fab.wab.customer.feature.profile.presentation.controller.vm.EditProfileViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val JORDAN = Country("JO", "الأردن", "+962", null, "^7[789]\\d{7}$")
private val AMMAN = City("city-1", "Amman")
private val ZARQA = City("city-2", "Zarqa")
private val ABDOUN = Area("area-1", "Abdoun")

private class EditLocationsFake : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(listOf(AMMAN, ZARQA))
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> =
        AppResult.Success(if (cityId == AMMAN.id) listOf(ABDOUN) else listOf(Area("area-2", "Center")))
}

@OptIn(ExperimentalCoroutinesApi::class)
class EditProfileViewModelTest {

    private val effects = mutableListOf<SideEffect>()
    private val profile = ProfileRepoFake()
    private val auth = AuthRepoFake()
    private val pending = PendingOtpVerification()
    private val session = SessionStoreFake(USER)

    private fun TestScope.viewModel(): EditProfileViewModel {
        val deps = EditProfileDependencies(
            loadProfile = LoadProfileUseCase(profile),
            updateProfile = UpdateProfileUseCase(profile, session),
            changePhone = ChangePhoneUseCase(auth, session),
            locations = EditLocationsFake(),
            pending = pending,
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
        )
        val vm = EditProfileViewModel(deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.onStart()
        return vm
    }

    @Test
    fun prefillsFromTheAccountAndSavesDirectlyWhenThePhoneIsUnchanged() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        val s = vm.state.value
        assertFalse(s.loading)
        assertEquals("Sara", s.firstName)
        assertEquals(AMMAN.id, s.cityId)
        assertEquals(ABDOUN.id, s.areaId)
        assertEquals("790000000", s.number)
        assertTrue(s.isNumberValid)
        assertFalse(s.phoneChanged)
        assertTrue(s.canSave)
        vm.onEvent(UiAction.OnLastNameChange("Omar"))
        vm.onEvent(UiAction.OnCitySelect(ZARQA.id))
        assertNull(vm.state.value.areaId, "changing the city clears the area")
        vm.onEvent(UiAction.OnAreaSelect("area-2"))
        vm.onEvent(UiAction.OnSaveClick)
        assertEquals(ProfileUpdate("Sara", "Omar", "s@x.com", Gender.FEMALE, ZARQA.id, "area-2"), profile.updates.single())
        assertEquals<SideEffect>(SideEffect.Saved, effects.single())
        assertTrue(auth.phoneChanges.isEmpty())
    }

    @Test
    fun changedPhoneGoesThroughOtpThenChangesThePhoneAndSaves() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnNumberChange("0788888888"))
        assertTrue(vm.state.value.phoneChanged)
        vm.onEvent(UiAction.OnSaveClick)
        assertEquals<SideEffect>(SideEffect.NavigateToOtp(PhoneNumber("JO", "788888888")), effects.single())
        assertTrue(profile.updates.isEmpty(), "nothing saved before the OTP")
        pending.publish(OtpVerified(AuthPurpose.REGISTER, PhoneNumber("JO", "788888888"), "other-flow"))
        assertTrue(auth.phoneChanges.isEmpty(), "another flow's proof is ignored")
        pending.consume()
        pending.publish(OtpVerified(AuthPurpose.CHANGE_PHONE, PhoneNumber("JO", "788888888"), "proof"))
        assertEquals(listOf(PhoneNumber("JO", "788888888")), auth.phoneChanges)
        assertEquals(1, profile.updates.size)
        assertEquals<SideEffect>(SideEffect.Saved, effects.last())
        assertFalse(vm.state.value.phoneChanged, "the verified number is now the original")
        assertNull(pending.consume())
    }

    @Test
    fun invalidFormShowsErrorsAndDoesNotSave() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnEmailChange("nope"))
        vm.onEvent(UiAction.OnSaveClick)
        assertTrue(vm.state.value.submitted)
        assertFalse(vm.state.value.canSave)
        assertTrue(profile.updates.isEmpty())
        assertTrue(effects.isEmpty())
    }
}
