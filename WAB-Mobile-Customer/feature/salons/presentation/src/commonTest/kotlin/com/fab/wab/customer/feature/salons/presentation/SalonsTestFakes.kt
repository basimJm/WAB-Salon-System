package com.fab.wab.customer.feature.salons.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.provider.DeviceLocationProvider
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonFilters
import com.fab.wab.customer.core.domain.salon.SalonQuery
import com.fab.wab.customer.core.domain.salon.SalonSearchRepository
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.search.InMemoryRecentSearchesStore
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionManager
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.home.domain.usecase.GetCurrentLocationUseCase
import com.fab.wab.customer.feature.salons.domain.model.SearchSuggestions
import com.fab.wab.customer.feature.salons.domain.model.SuggestedPlace
import com.fab.wab.customer.feature.salons.domain.model.SuggestedService
import com.fab.wab.customer.feature.salons.domain.repository.SalonSuggestionsRepository
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSalonsUseCase
import com.fab.wab.customer.feature.salons.domain.usecase.SearchSuggestionsUseCase
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsContract.SideEffect
import com.fab.wab.customer.feature.salons.presentation.controller.contract.AllSalonsEntry
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsDependencies
import com.fab.wab.customer.feature.salons.presentation.controller.vm.AllSalonsViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope

/** Fakes of the S04 view-model tests. */
internal fun salon(id: String) = SalonSummary(
    id = id, name = id, imageUrl = null, rating = 4f, reviewsCount = 1, locationText = null, shortDescription = null,
    isOpenNow = true, todayHours = null, isFavorite = false, distanceKm = null,
)

internal class SearchFake : SalonSearchRepository {
    val queries = mutableListOf<SalonQuery>()
    var pageSizeAnswer = 10
    var result: AppResult<List<SalonSummary>>? = null
    override suspend fun search(query: SalonQuery): AppResult<List<SalonSummary>> {
        queries += query
        return result ?: AppResult.Success(List(pageSizeAnswer) { salon("p${query.page}-$it") })
    }
}

internal class PermissionManagerFake(var status: PermissionStatus) : PermissionManager {
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

internal class FavoritesFake : FavoritesRepository {
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> = AppResult.Success(favorite)
    override suspend fun list(page: Int, pageSize: Int): AppResult<List<SalonSummary>> = AppResult.Success(emptyList())
}

internal class SessionStoreFake(initial: SessionState) : SessionStore {
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

internal val GUEST = SessionState.Guest(GuestProfile("Sara", Gender.FEMALE))
internal val AMMAN = LocationData(31.95, 35.93)
internal const val DEBOUNCE = 500L

internal class SuggestionsFake : SalonSuggestionsRepository {
    val calls = mutableListOf<Pair<String, SalonFilters>>()
    var result: AppResult<SearchSuggestions> = AppResult.Success(
        SearchSuggestions(
            services = listOf(SuggestedService("sv1", "Laser", BusinessType.CLINIC, 3)),
            places = listOf(SuggestedPlace("p1", "Laser Lounge", BusinessType.SALON, null)),
        ),
    )
    override suspend fun suggestions(text: String, filters: SalonFilters): AppResult<SearchSuggestions> {
        calls += text to filters
        return result
    }
}

/** One S04 view model over the fakes (shared by the S04 tests). */
internal class SalonsHarness {
    val search = SearchFake()
    val suggestions = SuggestionsFake()
    val recent = InMemoryRecentSearchesStore()
    val permissions = PermissionManagerFake(PermissionStatus.DENIED)
    val effects = mutableListOf<SideEffect>()

    fun viewModel(scope: TestScope, entry: AllSalonsEntry = AllSalonsEntry()): AllSalonsViewModel {
        val provider = object : DeviceLocationProvider {
            override suspend fun currentLocation(): LocationData? = AMMAN
        }
        val deps = AllSalonsDependencies(
            searchSalons = SearchSalonsUseCase(search),
            suggestions = SearchSuggestionsUseCase(suggestions),
            recentSearches = recent,
            currentLocation = GetCurrentLocationUseCase(provider),
            sessionStore = SessionStoreFake(GUEST),
            permissions = PermissionFlow(permissions),
            favorites = FavoritesFake(),
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
            debounceMs = DEBOUNCE,
        )
        val vm = AllSalonsViewModel(entry, deps, testScope = scope.backgroundScope)
        scope.backgroundScope.launch { vm.state.collect {} }
        scope.backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        return vm
    }
}

