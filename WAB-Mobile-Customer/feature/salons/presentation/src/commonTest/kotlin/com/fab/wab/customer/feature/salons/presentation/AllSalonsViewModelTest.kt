package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import com.fab.wab.customer.core.domain.salon.GeneralFilter
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.SalonSearchRepository
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.salon.ServiceRef
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionManager
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSalonsUseCase
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SalonsDialog
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.UiAction
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.contract.FilterChipId
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsViewModel
import com.fab.wab.customer.feature.salons.presentation.controller.vm.toFilters
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

private fun salon(id: String) = SalonSummary(
    id = id, name = id, imageUrl = null, rating = 4f, reviewsCount = 1, locationText = null, shortDescription = null,
    isOpenNow = true, todayHours = null, isFavorite = false, distanceKm = null,
)

private class SearchFake : SalonSearchRepository {
    val queries = mutableListOf<SalonQuery>()
    var pageSizeAnswer = 10
    var result: AppResult<List<SalonSummary>>? = null
    override suspend fun search(query: SalonQuery): AppResult<List<SalonSummary>> {
        queries += query
        return result ?: AppResult.Success(List(pageSizeAnswer) { salon("p${query.page}-$it") })
    }
}

private class PermissionManagerFake(var status: PermissionStatus) : PermissionManager {
    var requestResult: PermissionStatus = status
    override suspend fun status(permission: AppPermission): PermissionStatus = status
    override suspend fun request(permission: AppPermission): PermissionStatus {
        status = requestResult
        return status
    }
    override fun openSettings(permission: AppPermission) = Unit
    override fun isLocationServiceEnabled(): Boolean = true
    override fun openLocationServiceSettings() = Unit
}

private class FavoritesFake : FavoritesRepository {
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> = AppResult.Success(favorite)
    override suspend fun list(page: Int, pageSize: Int): AppResult<List<SalonSummary>> = AppResult.Success(emptyList())
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

private val GUEST = SessionState.Guest(GuestProfile("Sara", Gender.FEMALE))
private val AMMAN = LocationData(31.95, 35.93)
private const val DEBOUNCE = 500L

@OptIn(ExperimentalCoroutinesApi::class)
class AllSalonsViewModelTest {

    private val search = SearchFake()
    private val permissions = PermissionManagerFake(PermissionStatus.DENIED)
    private val effects = mutableListOf<SideEffect>()

    private fun TestScope.viewModel(entry: AllSalonsEntry = AllSalonsEntry()): AllSalonsViewModel {
        val provider = object : DeviceLocationProvider {
            override suspend fun currentLocation(): LocationData? = AMMAN
        }
        val deps = AllSalonsDependencies(
            searchSalons = SearchSalonsUseCase(search),
            currentLocation = GetCurrentLocationUseCase(provider),
            sessionStore = SessionStoreFake(GUEST),
            permissions = PermissionFlow(permissions),
            favorites = FavoritesFake(),
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
            debounceMs = DEBOUNCE,
        )
        val vm = AllSalonsViewModel(entry, deps, testScope = backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun entryPresetsBecomeFilters() {
        assertEquals(GeneralFilter.RECOMMENDED, AllSalonsEntry(filter = SalonListFilter.RECOMMENDED).toFilters().general)
        assertEquals(listOf(ServiceRef("s1", "Hair")), AllSalonsEntry(serviceId = "s1", serviceName = "Hair").toFilters().services)
        assertTrue(AllSalonsEntry().toFilters().isEmpty)
    }

    @Test
    fun loadsTheFirstPageWithGenderAndPresetsThenPages() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AllSalonsEntry(gender = Gender.MALE, filter = SalonListFilter.RECOMMENDED))
        val first = search.queries.single()
        assertEquals(Gender.MALE, first.gender)
        assertEquals(GeneralFilter.RECOMMENDED, first.filters.general)
        assertEquals(1, first.page)
        assertTrue(vm.state.value.hasMore)
        vm.onEvent(UiAction.OnLoadMore)
        assertEquals(2, search.queries.last().page)
        assertEquals(20, vm.state.value.salons.size)
    }

    @Test
    fun withoutAnEntryGenderTheSessionGenderIsUsed() = runTest(UnconfinedTestDispatcher()) {
        viewModel()
        assertEquals(Gender.FEMALE, search.queries.single().gender)
    }

    @Test
    fun searchIsDebouncedNotPerKeystroke() = runTest {
        val vm = viewModel()
        runCurrent()
        vm.onEvent(UiAction.OnTextChange("g"))
        vm.onEvent(UiAction.OnTextChange("gl"))
        vm.onEvent(UiAction.OnTextChange("glo"))
        advanceTimeBy(DEBOUNCE / 2)
        runCurrent()
        assertEquals(1, search.queries.size)
        advanceTimeBy(DEBOUNCE + 1)
        runCurrent()
        assertEquals(2, search.queries.size)
        assertEquals("glo", search.queries.last().text)
    }

    @Test
    fun removingAChipReloadsWithoutIt() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AllSalonsEntry(serviceId = "s1", serviceName = "Hair", filter = SalonListFilter.RECOMMENDED))
        vm.onEvent(UiAction.OnChipRemove(FilterChipId.Service("s1")))
        assertTrue(search.queries.last().filters.services.isEmpty())
        vm.onEvent(UiAction.OnChipRemove(FilterChipId.General))
        assertNull(search.queries.last().filters.general)
        assertEquals(3, search.queries.size)
    }

    @Test
    fun nearestWithoutLocationAsksAndDropsTheFilterWhenRefused() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(AllSalonsEntry(filter = SalonListFilter.NEAREST))
        assertTrue(search.queries.isEmpty())
        assertEquals(SalonsDialog.LocationExplanation, vm.state.value.dialog)
        vm.onEvent(UiAction.OnDialogConfirm)
        assertNull(vm.state.value.filters.general)
        assertEquals(SideEffect.NearestDropped, effects.last())
        assertNull(search.queries.single().location)
    }

    @Test
    fun nearestWithLocationGrantedSendsCoordinates() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.GRANTED
        viewModel(AllSalonsEntry(filter = SalonListFilter.NEAREST))
        assertEquals(AMMAN, search.queries.single().location)
    }

    @Test
    fun emptyAndErrorStates() = runTest(UnconfinedTestDispatcher()) {
        search.result = AppResult.Success(emptyList())
        val vm = viewModel()
        assertTrue(vm.state.value.loaded)
        assertTrue(vm.state.value.salons.isEmpty())
        search.result = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnRetry)
        assertTrue(vm.state.value.offline)
        assertEquals("error", vm.state.value.error)
    }
}
