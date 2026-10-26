package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.notification.push.PushNotification
import com.fab.wab.customer.core.notification.push.PushSignals
import com.fab.wab.customer.core.realtime.FakeRealtimeClient
import com.fab.wab.customer.core.realtime.RealtimeEvent
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionManager
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.home.domain.model.BannerAction
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.repository.HomeRepository
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.home.domain.usecase.LoadHomeUseCase
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeDialog
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeDependencies
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue

private fun salon(id: String, favorite: Boolean = false) = SalonSummary(
    id = id, name = id, imageUrl = null, rating = 4f, reviewsCount = 1, locationText = null, shortDescription = null,
    isOpenNow = true, todayHours = null, isFavorite = favorite, distanceKm = null,
)

private fun content(nearest: HomeSection<SalonSummary>? = null, unread: Int = 3) = HomeContent(
    unreadCount = unread,
    banners = listOf(HomeBanner("b1", "img", BannerAction.ExternalUrl("https://example.invalid"))),
    services = HomeSection(emptyList(), hasMore = false),
    recommended = HomeSection(listOf(salon("r1")), hasMore = true),
    nearest = nearest,
)

private class HomeRepositoryFake : HomeRepository {
    val calls = mutableListOf<Pair<Gender, LocationData?>>()
    var result: AppResult<HomeContent> = AppResult.Success(content())
    override suspend fun load(gender: Gender, location: LocationData?): AppResult<HomeContent> {
        calls += gender to location
        return result
    }
}

private class PermissionManagerFake(var status: PermissionStatus, var serviceEnabled: Boolean = true) : PermissionManager {
    var requests = 0
    var settingsOpened = 0
    var requestResult: PermissionStatus = status
    override suspend fun status(permission: AppPermission): PermissionStatus = status
    override suspend fun request(permission: AppPermission): PermissionStatus {
        requests += 1
        status = requestResult
        return status
    }
    override fun openSettings(permission: AppPermission) {
        settingsOpened += 1
    }
    override fun isLocationServiceEnabled(): Boolean = serviceEnabled
    override fun openLocationServiceSettings() = Unit
}

private class FavoritesFake(var result: AppResult<Boolean>? = null) : FavoritesRepository {
    val calls = mutableListOf<Pair<String, Boolean>>()
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> {
        calls += salonId to favorite
        return result ?: AppResult.Success(favorite)
    }
    override suspend fun list(page: Int, pageSize: Int): AppResult<List<SalonSummary>> = AppResult.Success(emptyList())
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
private val AMMAN = LocationData(31.95, 35.93)

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private val repository = HomeRepositoryFake()
    private val permissions = PermissionManagerFake(PermissionStatus.DENIED)
    private val favorites = FavoritesFake()
    private val realtime = FakeRealtimeClient()
    private val effects = mutableListOf<SideEffect>()
    private var fix: LocationData? = AMMAN
    private val language = MutableStateFlow(AppLanguage.ARABIC)

    private fun kotlinx.coroutines.test.TestScope.viewModel(session: SessionState = GUEST): HomeViewModel {
        val provider = object : DeviceLocationProvider {
            override fun fetchCurrentLocation(onResult: (LocationData?) -> Unit) = onResult(fix)
        }
        val deps = HomeDependencies(
            loadHome = LoadHomeUseCase(repository),
            currentLocation = GetCurrentLocationUseCase(provider),
            sessionStore = SessionStoreFake(session),
            permissions = PermissionFlow(permissions),
            favorites = favorites,
            realtime = realtime,
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
            languageChanges = language,
        )
        val vm = HomeViewModel(deps, testScope = backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }

    @Test
    fun guestLoadsHerGenderWithoutLocationAndSeesNoBadge() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertEquals(listOf<Pair<Gender, LocationData?>>(Gender.FEMALE to null), repository.calls)
        val state = vm.state.value
        assertEquals("Sara", state.welcomeName)
        assertEquals(false, state.signedIn)
        assertEquals(0, state.unreadCount)
        assertEquals(NearestUi.LocationOff, state.nearest)
        assertTrue(state.hasContent)
        assertEquals(true, state.recommended.hasMore)
    }

    @Test
    fun languageSwitchReloadsTheLocalizedContent() = runTest(UnconfinedTestDispatcher()) {
        // CUS-092: AR -> EN kept Arabic service names until a pull-to-refresh.
        viewModel()
        assertEquals(1, repository.calls.size)
        language.value = AppLanguage.ARABIC
        assertEquals(1, repository.calls.size, "same language: no reload")
        language.value = AppLanguage.ENGLISH
        assertEquals(2, repository.calls.size)
    }

    @Test
    fun genderTabReloadsForThatGender() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnGenderSelect(Gender.MALE))
        assertEquals(Gender.MALE, repository.calls.last().first)
        vm.onEvent(UiAction.OnGenderSelect(Gender.MALE))
        assertEquals(2, repository.calls.size)
    }

    @Test
    fun registeredUserWithLocationSendsCoordinatesAndGetsLiveBadge() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.GRANTED
        repository.result = AppResult.Success(content(nearest = HomeSection(listOf(salon("n1")), hasMore = false)))
        val vm = viewModel(USER)
        assertEquals(USER.user.firstName, vm.state.value.welcomeName)
        assertEquals(AMMAN, repository.calls.single().second)
        assertEquals(3, vm.state.value.unreadCount)
        assertIs<NearestUi.Salons>(vm.state.value.nearest)
        realtime.emit(RealtimeEvent(RealtimeEvents.NOTIFICATIONS_UNREAD, buildJsonObject { put("count", JsonPrimitive(120)) }))
        assertEquals(120, vm.state.value.unreadCount)
        PushSignals.publishReceived(PushNotification("Approved", "Your booking was approved"))
        assertEquals(2, repository.calls.size, "a foreground push refreshes Home (badge)")
    }

    @Test
    fun locationGrantedButNoSalonsShowsTheEmptyMessage() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.GRANTED
        repository.result = AppResult.Success(content(nearest = HomeSection(emptyList(), hasMore = false)))
        assertEquals(NearestUi.Empty, viewModel().state.value.nearest)
    }

    @Test
    fun enableLocationAsksThroughTheExplanationDialogThenReloads() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnEnableLocationClick)
        assertEquals(HomeDialog.LocationExplanation, vm.state.value.dialog)
        permissions.requestResult = PermissionStatus.GRANTED
        vm.onEvent(UiAction.OnDialogConfirm)
        assertNull(vm.state.value.dialog)
        assertEquals(1, permissions.requests)
        assertEquals(AMMAN, repository.calls.last().second)
    }

    @Test
    fun permanentlyDeniedLocationOffersTheSettings() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.DENIED_PERMANENTLY
        val vm = viewModel()
        vm.onEvent(UiAction.OnEnableLocationClick)
        vm.onEvent(UiAction.OnDialogConfirm)
        assertEquals(HomeDialog.LocationDenied, vm.state.value.dialog)
        vm.onEvent(UiAction.OnDialogConfirm)
        assertEquals(1, permissions.settingsOpened)
    }

    @Test
    fun favoriteIsAuthGatedAndOptimisticWithRevert() = runTest(UnconfinedTestDispatcher()) {
        val guest = viewModel()
        guest.onEvent(UiAction.OnFavoriteClick("r1"))
        assertEquals(HomeDialog.AuthRequired, guest.state.value.dialog)
        guest.onEvent(UiAction.OnDialogConfirm)
        assertEquals(SideEffect.OpenLogin, effects.last())

        favorites.result = AppResult.Error(AppError.NetworkError("offline"))
        val user = viewModel(USER)
        user.onEvent(UiAction.OnFavoriteClick("r1"))
        assertEquals(listOf("r1" to true), favorites.calls)
        assertEquals(false, user.state.value.recommended.items.single().isFavorite)
        assertIs<SideEffect.ShowError>(effects.last())
    }

    @Test
    fun bannerActionsAndFailuresAreSurfaced() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnBannerClick("b1"))
        assertEquals(SideEffect.OpenUrl("https://example.invalid"), effects.last())

        repository.result = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(UiAction.OnRefresh)
        assertTrue(vm.state.value.offline)
        assertTrue(vm.state.value.hasContent)
        assertIs<SideEffect.ShowError>(effects.last())
    }

    @Test
    fun nearestEntryOpensTheSalonWithItsBranchPreselected() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnSalonClick("s1", "b2"))
        assertEquals(SideEffect.OpenSalon("s1", "b2"), effects.last())
        vm.onEvent(UiAction.OnSalonClick("s1"))
        assertEquals(SideEffect.OpenSalon("s1", null), effects.last())
    }

    @Test
    fun firstLoadFailureShowsTheErrorState() = runTest(UnconfinedTestDispatcher()) {
        repository.result = AppResult.Error(AppError.UnknownError("boom"))
        val state = viewModel().state.value
        assertEquals("error", state.error)
        assertEquals(false, state.hasContent)
        assertEquals(false, state.loading)
    }
}
