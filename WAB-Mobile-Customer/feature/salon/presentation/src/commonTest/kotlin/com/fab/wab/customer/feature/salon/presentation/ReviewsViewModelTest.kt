package com.fab.wab.customer.feature.salon.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.salon.RatingSummary
import com.fab.wab.customer.core.domain.salon.Review
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.salon.domain.model.ReviewDraft
import com.fab.wab.customer.feature.salon.domain.model.ReviewTarget
import com.fab.wab.customer.feature.salon.domain.model.ReviewsPage
import com.fab.wab.customer.feature.salon.domain.repository.ReviewsRepository
import com.fab.wab.customer.feature.salon.domain.usecase.LoadReviewsUseCase
import com.fab.wab.customer.feature.salon.domain.usecase.SubmitReviewUseCase
import com.fab.wab.customer.feature.salon.domain.usecase.reviewDraftOf
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.SideEffect
import com.fab.wab.customer.feature.salon.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.customer.feature.salon.presentation.controller.vm.ReviewsDependencies
import com.fab.wab.customer.feature.salon.presentation.controller.vm.ReviewsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class ReviewsFake : ReviewsRepository {
    val pages = mutableListOf<Pair<ReviewTarget, Int>>()
    val submitted = mutableListOf<Pair<ReviewTarget, ReviewDraft>>()
    var perPage = 10
    var submitResult: AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun list(target: ReviewTarget, page: Int, pageSize: Int): AppResult<ReviewsPage> {
        pages += target to page
        val items = List(perPage) { Review("r$page-$it", "Lina", 4f, null, "2026-10-18") }
        return AppResult.Success(ReviewsPage(items, RatingSummary(4f, 12)))
    }
    override suspend fun submit(target: ReviewTarget, draft: ReviewDraft): AppResult<Unit> {
        submitted += target to draft
        return submitResult
    }
}

private class ReviewsSessionFake(initial: SessionState) : SessionStore {
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

private val GUEST = SessionState.Guest(GuestProfile("Sara", Gender.FEMALE))
private val USER = SessionState.SignedIn(UserProfile("c1", "Omar", Gender.MALE))
private val STAFF = ReviewTarget.Staff("s1", "m1")

@OptIn(ExperimentalCoroutinesApi::class)
class ReviewsViewModelTest {

    private val repository = ReviewsFake()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(session: SessionState, target: ReviewTarget = STAFF, openForm: Boolean = false): ReviewsViewModel {
        val deps = ReviewsDependencies(
            LoadReviewsUseCase(repository), SubmitReviewUseCase(repository), ReviewsSessionFake(session), NoOpAnalyticsTracker, { "error" },
        )
        val vm = ReviewsViewModel(target, openForm, deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun draftValidationFollowsTheContract() {
        assertNull(reviewDraftOf(0, ""))
        assertEquals(ReviewDraft(5, null), reviewDraftOf(5, "  "))
        assertEquals(ReviewDraft(3, "Great"), reviewDraftOf(3, " Great "))
        assertNull(reviewDraftOf(3, "x".repeat(1001)))
    }

    @Test
    fun loadsPagesForTheTargetAndGatesTheFormForGuests() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(GUEST)
        assertEquals(listOf<Pair<ReviewTarget, Int>>(STAFF to 1), repository.pages)
        assertEquals(12, vm.state.value.summary?.count)
        vm.onEvent(UiAction.OnLoadMore)
        assertEquals(2, repository.pages.last().second)
        assertEquals(20, vm.state.value.items.size)
        vm.onEvent(UiAction.OnAddReviewClick)
        assertTrue(vm.state.value.authDialog)
        assertNull(vm.state.value.form)
        vm.onEvent(UiAction.OnDialogConfirm)
        assertEquals<SideEffect>(SideEffect.OpenLogin, effects.last())
    }

    @Test
    fun registeredUserSubmitsAndSeesTheConfirmation() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(USER, openForm = true)
        assertTrue(vm.state.value.form != null)
        vm.onEvent(UiAction.OnSubmit)
        assertTrue(repository.submitted.isEmpty())
        vm.onEvent(UiAction.OnRatingChange(4))
        vm.onEvent(UiAction.OnCommentChange(" Nice "))
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(listOf<Pair<ReviewTarget, ReviewDraft>>(STAFF to ReviewDraft(4, "Nice")), repository.submitted)
        assertEquals<SideEffect>(SideEffect.Submitted, effects.last())
        assertEquals(true, vm.state.value.form?.submitted)
        assertEquals(false, vm.state.value.form?.canSubmit)
        vm.onEvent(UiAction.OnFormDismiss)
        assertNull(vm.state.value.form)
        repository.submitResult = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnAddReviewClick)
        vm.onEvent(UiAction.OnRatingChange(2))
        vm.onEvent(UiAction.OnSubmit)
        assertEquals(false, vm.state.value.form?.submitting)
        assertTrue(effects.last() is SideEffect.ShowError)
    }
}
