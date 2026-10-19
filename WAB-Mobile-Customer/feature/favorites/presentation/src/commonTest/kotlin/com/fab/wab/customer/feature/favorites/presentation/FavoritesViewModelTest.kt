package com.fab.wab.customer.feature.favorites.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.feature.favorites.domain.usecase.LoadFavoritesUseCase
import com.fab.wab.customer.feature.favorites.domain.usecase.RemoveFavoriteUseCase
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.SideEffect
import com.fab.wab.customer.feature.favorites.presentation.controller.contract.FavoritesContract.UiAction
import com.fab.wab.customer.feature.favorites.presentation.controller.vm.FavoritesViewModel
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

private fun salon(id: String) = SalonSummary(
    id = id, name = id, imageUrl = null, rating = 4f, reviewsCount = 1, locationText = null, shortDescription = null,
    isOpenNow = true, todayHours = null, isFavorite = true, distanceKm = null,
)

private class FavoritesFake : FavoritesRepository {
    val pages = mutableListOf<Int>()
    val removed = mutableListOf<String>()
    var perPage = 10
    var removeResult: AppResult<Boolean> = AppResult.Success(false)
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> {
        removed += salonId
        return removeResult
    }
    override suspend fun list(page: Int, pageSize: Int): AppResult<List<SalonSummary>> {
        pages += page
        return AppResult.Success(List(perPage) { salon("p$page-$it") })
    }
}

private class SessionStoreFake(initial: SessionState) : SessionStore {
    val sessionState = MutableStateFlow(initial)
    override val state: Flow<SessionState> = sessionState
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

@OptIn(ExperimentalCoroutinesApi::class)
class FavoritesViewModelTest {

    private val repository = FavoritesFake()
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(store: SessionStoreFake): FavoritesViewModel {
        val vm = FavoritesViewModel(
            LoadFavoritesUseCase(repository), RemoveFavoriteUseCase(repository), store, NoOpAnalyticsTracker, { "error" }, backgroundScope,
        )
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun guestSeesTheMessageAndLoadsAfterLogin() = runTest(UnconfinedTestDispatcher()) {
        val store = SessionStoreFake(GUEST)
        val vm = viewModel(store)
        assertEquals(false, vm.state.value.signedIn)
        assertTrue(repository.pages.isEmpty())
        vm.onEvent(UiAction.OnLoginClick)
        assertEquals<SideEffect>(SideEffect.OpenLogin, effects.last())
        store.sessionState.value = USER
        assertEquals(listOf(1), repository.pages)
        assertEquals(10, vm.state.value.salons.size)
        vm.onEvent(UiAction.OnLoadMore)
        assertEquals(listOf(1, 2), repository.pages)
    }

    @Test
    fun heartRemovesOptimisticallyAndRestoresOnFailure() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(SessionStoreFake(USER))
        vm.onEvent(UiAction.OnRemoveClick("p1-3"))
        assertEquals(9, vm.state.value.salons.size)
        assertEquals(listOf("p1-3"), repository.removed)
        repository.removeResult = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnRemoveClick("p1-0"))
        assertEquals(9, vm.state.value.salons.size)
        assertEquals("p1-0", vm.state.value.salons.first().id)
        assertTrue(effects.last() is SideEffect.ShowError)
    }

    @Test
    fun emptyListOffersExploreAndResumeRefreshes() = runTest(UnconfinedTestDispatcher()) {
        repository.perPage = 0
        val vm = viewModel(SessionStoreFake(USER))
        assertTrue(vm.state.value.loaded)
        vm.onEvent(UiAction.OnExploreClick)
        assertEquals<SideEffect>(SideEffect.OpenHome, effects.last())
        vm.onEvent(UiAction.OnResume)
        assertEquals(listOf(1, 1), repository.pages)
    }
}
