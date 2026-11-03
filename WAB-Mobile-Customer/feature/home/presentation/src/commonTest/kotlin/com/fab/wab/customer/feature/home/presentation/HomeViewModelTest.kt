package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.navigation.route.SalonListFilter
import com.fab.wab.customer.core.notification.push.PushNotification
import com.fab.wab.customer.core.notification.push.PushSignals
import com.fab.wab.customer.core.realtime.FakeRealtimeClient
import com.fab.wab.customer.core.realtime.RealtimeEvent
import com.fab.wab.customer.core.realtime.RealtimeEvents
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.home.domain.model.BookAgainEntry
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.home.domain.usecase.LoadHomeUseCase
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeBlock
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.HomeDialog
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.NearestUi
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SalonSection
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.SideEffect
import com.fab.wab.customer.feature.home.presentation.controller.contract.HomeContract.UiAction
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeDependencies
import com.fab.wab.customer.feature.home.presentation.controller.vm.HomeViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
            override suspend fun currentLocation(): LocationData? = fix
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
    fun guestLoadsEveryTypeWithHerGenderForBannersWithoutLocationAndSeesNoBadge() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        assertEquals(listOf(HomeCall(Gender.FEMALE, null, null)), repository.calls, "lens All by default")
        val state = vm.state.value
        assertEquals("Sara", state.welcomeName)
        assertEquals(false, state.signedIn)
        assertEquals(0, state.unreadCount)
        assertEquals(NearestUi.LocationOff, state.nearYou)
        assertTrue(state.hasContent)
        assertEquals(true, state.recommended.hasMore)
        assertEquals(null, state.lens)
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
    fun lensChangeReloadsEverySectionWithTheBusinessType() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnLensSelect(BusinessType.TATTOO))
        assertEquals(HomeCall(Gender.FEMALE, BusinessType.TATTOO, null), repository.calls.last())
        assertEquals(BusinessType.TATTOO, vm.state.value.lens)
        vm.onEvent(UiAction.OnLensSelect(BusinessType.TATTOO))
        assertEquals(2, repository.calls.size, "same lens: no reload")
        vm.onEvent(UiAction.OnRefresh)
        assertEquals(BusinessType.TATTOO, repository.calls.last().lens, "a refresh keeps the lens")
        vm.onEvent(UiAction.OnLensSelect(null))
        assertEquals(null, repository.calls.last().lens)
    }

    @Test
    fun sectionsFollowTheMergedHomeOrder() = runTest(UnconfinedTestDispatcher()) {
        val entry = BookAgainEntry(salon("s9"), "bk1", listOf("ss1"))
        repository.result = AppResult.Success(content(bookAgain = listOf(entry)))
        val user = viewModel(USER).state.value
        assertEquals(
            listOf(HomeBlock.Banners, HomeBlock.Explore, HomeBlock.NearYou, HomeBlock.Recommended, HomeBlock.BookAgain),
            user.blocks,
        )
        assertEquals(listOf(entry), user.bookAgain)
    }

    @Test
    fun guestsNeverSeeBookAgain() = runTest(UnconfinedTestDispatcher()) {
        repository.result = AppResult.Success(content(bookAgain = listOf(BookAgainEntry(salon("s9"), "bk1", emptyList()))))
        val guest = viewModel().state.value
        assertEquals(emptyList(), guest.bookAgain)
        assertTrue(HomeBlock.BookAgain !in guest.blocks)
    }

    @Test
    fun bookAgainOpensTheBusinessOfThatBooking() = runTest(UnconfinedTestDispatcher()) {
        repository.result = AppResult.Success(content(bookAgain = listOf(BookAgainEntry(salon("s9"), "bk1", listOf("ss1")))))
        val vm = viewModel(USER)
        vm.onEvent(UiAction.OnBookAgainClick("s9"))
        assertEquals(SideEffect.OpenSalon("s9"), effects.last())
    }

    @Test
    fun registeredUserWithLocationSendsCoordinatesAndGetsLiveBadge() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.GRANTED
        repository.result = AppResult.Success(content(nearest = HomeSection(listOf(salon("n1")), hasMore = false)))
        val vm = viewModel(USER)
        assertEquals(USER.user.firstName, vm.state.value.welcomeName)
        assertEquals(AMMAN, repository.calls.single().location)
        assertEquals(Gender.MALE, repository.calls.single().gender, "the account's gender picks the banners")
        assertEquals(3, vm.state.value.unreadCount)
        assertIs<NearestUi.Salons>(vm.state.value.nearYou)
        realtime.emit(RealtimeEvent(RealtimeEvents.NOTIFICATIONS_UNREAD, buildJsonObject { put("count", JsonPrimitive(120)) }))
        assertEquals(120, vm.state.value.unreadCount)
        PushSignals.publishReceived(PushNotification("Approved", "Your booking was approved"))
        assertEquals(2, repository.calls.size, "a foreground push refreshes Home (badge)")
    }

    @Test
    fun locationGrantedButNoSalonsShowsTheEmptyMessage() = runTest(UnconfinedTestDispatcher()) {
        permissions.status = PermissionStatus.GRANTED
        repository.result = AppResult.Success(content(nearest = HomeSection(emptyList(), hasMore = false)))
        assertEquals(NearestUi.Empty, viewModel().state.value.nearYou)
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
        assertEquals(AMMAN, repository.calls.last().location)
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
        assertEquals(false, user.state.value.recommended.items.first().isFavorite)
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
    fun seeAllKeepsTheLensAndServicesOpenWithTheirType() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel()
        vm.onEvent(UiAction.OnSeeAll(SalonSection.Nearest))
        assertEquals(SideEffect.OpenAllSalons(Gender.FEMALE, null, null, SalonListFilter.NEAREST, null), effects.last(), "lens All")
        vm.onEvent(UiAction.OnServicesSeeMore)
        assertEquals(SideEffect.OpenAllServices(Gender.FEMALE, null), effects.last())
        vm.onEvent(UiAction.OnLensSelect(BusinessType.CLINIC))
        vm.onEvent(UiAction.OnSeeAll(SalonSection.Recommended))
        assertEquals(SideEffect.OpenAllSalons(Gender.FEMALE, null, null, SalonListFilter.RECOMMENDED, BusinessType.CLINIC), effects.last())
        vm.onEvent(UiAction.OnServicesSeeMore)
        assertEquals(SideEffect.OpenAllServices(Gender.FEMALE, BusinessType.CLINIC), effects.last())
        vm.onEvent(UiAction.OnServiceClick("cv1"))
        assertEquals(SideEffect.OpenAllSalons(Gender.FEMALE, "cv1", "Botox", businessType = BusinessType.CLINIC), effects.last())
        vm.onEvent(UiAction.OnSearchClick)
        assertEquals(SideEffect.OpenAllSalons(Gender.FEMALE), effects.last(), "search lists every business type")
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
