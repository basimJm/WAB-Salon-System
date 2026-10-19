package com.fab.wab.customer.feature.salon.presentation

import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.salon.MemberRole
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.ReviewsPreview
import com.fab.wab.customer.core.domain.salon.SalonDetails
import com.fab.wab.customer.core.domain.salon.StaffMember
import com.fab.wab.customer.core.domain.salon.StaffStatus
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.salon.domain.repository.SalonDetailsRepository
import com.fab.wab.customer.feature.salon.domain.usecase.GetStaffMemberUseCase
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.contract.StaffSheetContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.vm.StaffSheetViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private val MEMBER = StaffMember(
    id = "m1", firstName = "Omar", photoUrl = null, status = StaffStatus.ON_DUTY, role = MemberRole.OWNER,
    rating = RatingSummary(4f, 2), bio = null, yearsOfExperience = 5, customersCount = 10, workingDays = emptyList(),
    services = emptyList(), reviews = ReviewsPreview(RatingSummary(4f, 2), emptyList()),
)

private class StaffRepositoryFake(var result: AppResult<StaffMember> = AppResult.Success(MEMBER)) : SalonDetailsRepository {
    val calls = mutableListOf<Pair<String, String>>()
    override suspend fun details(salonId: String): AppResult<SalonDetails> = AppResult.Loading
    override suspend fun staffMember(salonId: String, memberId: String): AppResult<StaffMember> {
        calls += salonId to memberId
        return result
    }
}

private class SessionStoreFake(initial: SessionState) : SessionStore {
    override val state: Flow<SessionState> = MutableStateFlow(initial)
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class StaffSheetViewModelTest {

    private val repository = StaffRepositoryFake()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(session: SessionState): StaffSheetViewModel {
        val vm = StaffSheetViewModel("s1", "m1", GetStaffMemberUseCase(repository), SessionStoreFake(session), { "error" }, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun loadsTheMemberAndGatesAddReviewForGuests() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(SessionState.Guest(GuestProfile("Sara", Gender.FEMALE)))
        assertEquals(listOf("s1" to "m1"), repository.calls)
        assertEquals(MEMBER, vm.state.value.member)
        vm.onEvent(UiAction.OnAddReviewClick)
        assertTrue(vm.state.value.authDialog)
        vm.onEvent(UiAction.OnDialogConfirm)
        assertEquals(SideEffect.OpenLogin, effects.last())
        vm.onEvent(UiAction.OnAllReviewsClick)
        assertEquals(SideEffect.OpenReviews("s1", "m1"), effects.last())
    }

    @Test
    fun registeredUserOpensAddReviewAndErrorsShow() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(SessionState.SignedIn(UserProfile("c1", "Omar", Gender.MALE)))
        vm.onEvent(UiAction.OnAddReviewClick)
        assertEquals(SideEffect.OpenAddReview("s1", "m1"), effects.last())
        repository.result = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnRetry)
        assertTrue(vm.state.value.offline)
        assertEquals("error", vm.state.value.error)
    }
}
