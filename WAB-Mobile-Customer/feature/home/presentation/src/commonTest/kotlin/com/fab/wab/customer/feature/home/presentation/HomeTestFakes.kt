package com.fab.wab.customer.feature.home.presentation

import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.favorites.FavoritesRepository
import com.fab.wab.customer.core.domain.model.LocationData
import com.fab.wab.customer.core.domain.salon.BusinessType
import com.fab.wab.customer.core.domain.salon.SalonSummary
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionManager
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.home.domain.model.BannerAction
import com.fab.wab.customer.feature.home.domain.model.BookAgainEntry
import com.fab.wab.customer.feature.home.domain.model.HomeBanner
import com.fab.wab.customer.feature.home.domain.model.HomeContent
import com.fab.wab.customer.feature.home.domain.model.HomeSection
import com.fab.wab.customer.feature.home.domain.model.HomeService
import com.fab.wab.customer.feature.home.domain.repository.HomeRepository
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow

/** Fakes of the Home view-model tests. */
internal fun salon(id: String, favorite: Boolean = false) = SalonSummary(
    id = id, name = id, imageUrl = null, rating = 4f, reviewsCount = 1, locationText = null, shortDescription = null,
    isOpenNow = true, todayHours = null, isFavorite = favorite, distanceKm = null,
)

internal fun content(nearest: HomeSection<SalonSummary>? = null, unread: Int = 3, bookAgain: List<BookAgainEntry>? = null) = HomeContent(
    unreadCount = unread,
    banners = listOf(HomeBanner("b1", "img", BannerAction.ExternalUrl("https://example.invalid"))),
    explore = HomeSection(
        listOf(HomeService("sv1", "Hair", "d", null), HomeService("cv1", "Botox", "d", null, BusinessType.CLINIC)),
        hasMore = true,
    ),
    nearYou = nearest,
    recommended = HomeSection(listOf(salon("r1"), salon("c1").copy(businessType = BusinessType.CLINIC)), hasMore = true),
    bookAgain = bookAgain?.let { HomeSection(it, hasMore = false) },
)

internal data class HomeCall(val gender: Gender, val lens: BusinessType?, val location: LocationData?)

internal class HomeRepositoryFake : HomeRepository {
    val calls = mutableListOf<HomeCall>()
    var result: AppResult<HomeContent> = AppResult.Success(content())
    /** When set, a load waits for it (to observe the state while a request is in flight). */
    var gate: CompletableDeferred<Unit>? = null
    override suspend fun load(gender: Gender, lens: BusinessType?, location: LocationData?): AppResult<HomeContent> {
        calls += HomeCall(gender, lens, location)
        gate?.await()
        return result
    }
}

internal class PermissionManagerFake(var status: PermissionStatus, var serviceEnabled: Boolean = true) : PermissionManager {
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

internal class FavoritesFake(var result: AppResult<Boolean>? = null) : FavoritesRepository {
    val calls = mutableListOf<Pair<String, Boolean>>()
    override suspend fun setFavorite(salonId: String, favorite: Boolean): AppResult<Boolean> {
        calls += salonId to favorite
        return result ?: AppResult.Success(favorite)
    }
    override suspend fun list(page: Int, pageSize: Int): AppResult<List<SalonSummary>> = AppResult.Success(emptyList())
}

internal class SessionStoreFake(initial: SessionState) : SessionStore {
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

internal val GUEST = SessionState.Guest(GuestProfile("Sara", Gender.FEMALE))
internal val USER = SessionState.SignedIn(UserProfile("c1", "Omar", Gender.MALE))
internal val AMMAN = LocationData(31.95, 35.93)
