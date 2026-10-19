package com.fab.wab.customer.feature.notifications.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.notification.push.PushNotification
import com.fab.wab.customer.core.notification.push.PushSignals
import com.fab.wab.customer.core.realtime.FakeRealtimeClient
import com.fab.wab.customer.core.realtime.RealtimeEvent
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.feature.notifications.domain.model.Notification
import com.fab.wab.customer.feature.notifications.domain.model.NotificationFilters
import com.fab.wab.customer.feature.notifications.domain.repository.NotificationsRepository
import com.fab.wab.customer.feature.notifications.domain.usecase.LoadNotificationsUseCase
import com.fab.wab.customer.feature.notifications.domain.usecase.MarkNotificationsReadUseCase
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationChip
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.SideEffect
import com.fab.wab.customer.feature.notifications.presentation.controller.contract.NotificationsContract.UiAction
import com.fab.wab.customer.feature.notifications.presentation.controller.vm.NotificationsDependencies
import com.fab.wab.customer.feature.notifications.presentation.controller.vm.NotificationsViewModel
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

private fun notification(id: String, read: Boolean = false, bookingId: String? = null) =
    Notification(id, "BOOKING", "booking.approved", "t$id", "b$id", read, "2026-10-19T10:00:00Z", bookingId, null)

private class NotificationsFake : NotificationsRepository {
    val lists = mutableListOf<Pair<NotificationFilters, Int>>()
    val marked = mutableListOf<List<String>>()
    var perPage = 10
    var markResult: AppResult<Int> = AppResult.Success(0)
    var listError: AppError? = null
    override suspend fun list(filters: NotificationFilters, page: Int, pageSize: Int): AppResult<List<Notification>> {
        lists += filters to page
        listError?.let { return AppResult.Error(it) }
        return AppResult.Success(List(perPage) { notification("$page-$it", bookingId = if (it == 0) "bk$page" else null) })
    }
    override suspend fun unreadCount(): AppResult<Int> = AppResult.Success(0)
    override suspend fun markRead(ids: List<String>): AppResult<Int> {
        marked += ids
        return markResult
    }
}

@OptIn(ExperimentalCoroutinesApi::class)
class NotificationsViewModelTest {

    private val effects = mutableListOf<SideEffect>()
    private val repository = NotificationsFake()
    private val realtime = FakeRealtimeClient()

    private fun TestScope.viewModel(): NotificationsViewModel {
        val deps = NotificationsDependencies(
            LoadNotificationsUseCase(repository), MarkNotificationsReadUseCase(repository), realtime, NoOpAnalyticsTracker, errorText = { "error" },
        )
        val vm = NotificationsViewModel(deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.onStart()
        return vm
    }

    @Test
    fun loadsPagesAndReportsVisibleUnreadItemsOnce() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertEquals(10, vm.state.value.items.size)
        assertTrue(vm.state.value.hasMore)
        vm.onEvent(UiAction.OnVisible(listOf("1-0", "1-1")))
        vm.onEvent(UiAction.OnVisible(listOf("1-1", "1-2")))
        assertEquals(listOf(listOf("1-0", "1-1"), listOf("1-2")), repository.marked)
        assertTrue(vm.state.value.items.first { it.id == "1-0" }.isRead)
        vm.onEvent(UiAction.OnLoadMore)
        assertEquals(20, vm.state.value.items.size)
        assertEquals(2, repository.lists.last().second)
    }

    @Test
    fun failedMarkReadIsRetriedOnTheNextVisibility() = runTest(UnconfinedTestDispatcher()) {
        repository.markResult = AppResult.Error(AppError.NetworkError("offline"))
        val vm = viewModel()
        vm.onEvent(UiAction.OnVisible(listOf("1-0")))
        repository.markResult = AppResult.Success(0)
        vm.onEvent(UiAction.OnVisible(listOf("1-0")))
        assertEquals(2, repository.marked.size)
    }

    @Test
    fun tapOpensThePopupAndViewBookingNavigates() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnItemClick("1-1"))
        assertEquals("1-1", vm.state.value.selected?.id)
        assertEquals(listOf(listOf("1-1")), repository.marked)
        vm.onEvent(UiAction.OnViewBooking)
        assertTrue(effects.isEmpty(), "a non-booking notification has no View booking")
        vm.onEvent(UiAction.OnPopupDismiss)
        vm.onEvent(UiAction.OnItemClick("1-0"))
        vm.onEvent(UiAction.OnViewBooking)
        assertEquals<SideEffect>(SideEffect.OpenBooking("bk1"), effects.single())
        assertNull(vm.state.value.selected)
    }

    @Test
    fun filterSheetAppliesResetsAndChipsRemove() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnFilterClick)
        vm.onEvent(UiAction.OnDraftFromChange("2026-10-10"))
        vm.onEvent(UiAction.OnDraftToChange("2026-10-01"))
        assertFalse(vm.state.value.sheet!!.datesValid)
        vm.onEvent(UiAction.OnApplyFilters)
        assertEquals(1, repository.lists.size, "invalid range is not applied")
        vm.onEvent(UiAction.OnDraftToChange("2026-10-19"))
        vm.onEvent(UiAction.OnDraftQueryChange(" glow "))
        vm.onEvent(UiAction.OnApplyFilters)
        assertEquals(NotificationFilters("2026-10-10", "2026-10-19", "glow"), repository.lists.last().first)
        assertEquals(listOf(NotificationChip.DATES, NotificationChip.TEXT), vm.state.value.chips)
        assertNull(vm.state.value.sheet)
        vm.onEvent(UiAction.OnChipRemove(NotificationChip.DATES))
        assertEquals(NotificationFilters(query = "glow"), repository.lists.last().first)
        vm.onEvent(UiAction.OnFilterClick)
        vm.onEvent(UiAction.OnResetFilters)
        assertEquals(NotificationFilters(), repository.lists.last().first)
        assertTrue(vm.state.value.chips.isEmpty())
    }

    @Test
    fun loadErrorShowsTheErrorStateAndRefreshKeepsContent() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        repository.listError = AppError.NetworkError("offline")
        vm.onEvent(UiAction.OnRefresh)
        assertEquals(10, vm.state.value.items.size)
        assertNull(vm.state.value.error)
        assertEquals<SideEffect>(SideEffect.ShowError("error"), effects.single())
    }

    @Test
    fun realtimeUnreadPushAndForegroundRefreshTheList() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertEquals(1, repository.lists.size)
        realtime.emit(RealtimeEvent(RealtimeEvents.NOTIFICATIONS_UNREAD))
        assertEquals(2, repository.lists.size)
        PushSignals.publishReceived(PushNotification("t", "b"))
        assertEquals(3, repository.lists.size)
        vm.onEvent(UiAction.OnResume)
        assertEquals(3, repository.lists.size, "the first resume comes with the first composition")
        vm.onEvent(UiAction.OnResume)
        assertEquals(4, repository.lists.size)
        assertEquals(10, vm.state.value.items.size)
    }
}
