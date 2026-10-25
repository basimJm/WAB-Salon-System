package com.fab.wab.merchant.feature.insights.presentation

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsScreen
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.branch.Branch
import com.fab.wab.merchant.core.domain.branch.BranchName
import com.fab.wab.merchant.core.domain.branch.BranchScope
import com.fab.wab.merchant.core.domain.branch.BranchStatus
import com.fab.wab.merchant.core.domain.config.ContactInfo
import com.fab.wab.merchant.core.domain.session.MemberScope
import com.fab.wab.merchant.feature.insights.domain.Review
import com.fab.wab.merchant.feature.insights.domain.ReviewStaff
import com.fab.wab.merchant.feature.insights.domain.ReviewSummary
import com.fab.wab.merchant.feature.insights.domain.ReviewTarget
import com.fab.wab.merchant.feature.insights.domain.ReviewsPage
import com.fab.wab.merchant.feature.insights.domain.ReviewsRepository
import com.fab.wab.merchant.feature.insights.presentation.analytics.InsightsAnalytics
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract.SideEffect
import com.fab.wab.merchant.feature.insights.presentation.controller.contract.ReviewsContract.UiAction
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.ReviewsDependencies
import com.fab.wab.merchant.feature.insights.presentation.controller.vm.ReviewsViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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

private val SARA = ReviewStaff("s1", "Sara")

private class FakeReviews : ReviewsRepository {
    val calls = mutableListOf<String>()
    var fail = false
    override suspend fun reviews(target: ReviewTarget, memberId: String?, branchId: String?, page: Int): AppResult<ReviewsPage> {
        calls += "$target:$memberId:$branchId:$page"
        if (fail) return AppResult.Error(AppError.NetworkError("x"))
        val items = listOf(Review("r$page", "Huda", 5.0, "Great", "2026-10-01T10:00:00Z", null, SARA.takeIf { target == ReviewTarget.STAFF }))
        return AppResult.Success(ReviewsPage(items, ReviewSummary(4.5, 2, mapOf(5 to 1, 4 to 1)), hasMore = page == 1))
    }
}

private class RecordingTracker : AnalyticsTracker {
    val actions = mutableListOf<AnalyticsAction>()
    override fun trackScreen(screen: AnalyticsScreen) = Unit
    override fun trackAction(action: AnalyticsAction) {
        actions += action
    }
    override fun trackRoute(route: String?) = Unit
    override fun setUserId(userId: String?) = Unit
    override fun setUserProperty(key: String, value: String?) = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class ReviewsViewModelTest {

    private val repo = FakeReviews()
    private val tracker = RecordingTracker()
    private val contact = ContactInfo("+962790000000", "+962791111111", "help@wab.jo")

    private fun TestScope.viewModel(scope: MutableStateFlow<BranchScope> = MutableStateFlow(BranchScope())) = ReviewsViewModel(
        ReviewsDependencies(repo, flowOf(contact), tracker, { "failed" }, scope, { id -> scope.value = scope.value.copy(selected = id) }),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun salonReviewsThenStaffTabWithSelectorAndPaging() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val salon = viewModel.state.first { !it.loading }
        assertEquals("SALON:null:null:1", repo.calls.first())
        assertEquals(4.5, salon.summary.average)
        assertTrue(salon.hasMore)
        assertFalse(salon.showsStaffSelector)
        viewModel.onEvent(UiAction.OnLoadMore)
        assertEquals(listOf("r1", "r2"), viewModel.state.first().reviews.map { it.id })
        viewModel.onEvent(UiAction.OnTarget(ReviewTarget.STAFF))
        val staff = viewModel.state.first { !it.loading }
        assertEquals("STAFF:null:null:1", repo.calls.last())
        assertEquals(listOf(SARA), staff.staffOptions)
        assertTrue(staff.showsStaffSelector)
        viewModel.onEvent(UiAction.OnStaff("s1"))
        assertEquals("STAFF:s1:null:1", repo.calls.last())
        viewModel.onEvent(UiAction.OnTarget(ReviewTarget.SALON))
        assertNull(viewModel.state.first().staffId)
        assertEquals(InsightsAnalytics.ACTION_REVIEWS_TAB, tracker.actions.first().name)
    }

    @Test
    fun ownerBranchChoiceIsSentAndErrorsShowRetry() = runTest(UnconfinedTestDispatcher()) {
        val branches = listOf("b1", "b2").map {
            Branch(it, BranchName(it, it), it == "b1", BranchStatus.ACTIVE, null, null, null, null, null, null, null, emptyList())
        }
        val scope = MutableStateFlow(BranchScope(MemberScope.AllBranches, branches, null))
        val viewModel = viewModel(scope)
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnBranchSelect("b2"))
        assertEquals("SALON:null:b2:1", repo.calls.last())
        repo.fail = true
        viewModel.onEvent(UiAction.OnRetry)
        assertEquals("failed", viewModel.state.first { !it.loading }.error)
    }

    @Test
    fun reportOpensContactWabWithTheReviewReference() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnReportWhatsApp)
        assertTrue(effects.isEmpty(), "no review chosen yet")
        viewModel.onEvent(UiAction.OnReport("r1"))
        assertEquals("r1", viewModel.state.first().reporting?.id)
        viewModel.onEvent(UiAction.OnReportWhatsApp)
        assertNull(viewModel.state.first().reporting)
        viewModel.onEvent(UiAction.OnReport("r1"))
        viewModel.onEvent(UiAction.OnReportEmail)
        viewModel.onEvent(UiAction.OnReport("r1"))
        viewModel.onEvent(UiAction.OnReportCall)
        assertEquals(
            listOf(
                SideEffect.WhatsAppReport(contact.whatsapp, "r1"),
                SideEffect.EmailReport(contact.email, "r1"),
                SideEffect.Dial(contact.phone),
            ),
            effects,
        )
        assertEquals(3, tracker.actions.count { it.name == InsightsAnalytics.ACTION_REVIEW_REPORT })
    }
}
