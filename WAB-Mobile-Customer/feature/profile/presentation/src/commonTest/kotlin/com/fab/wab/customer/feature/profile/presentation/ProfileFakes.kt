package com.fab.wab.customer.feature.profile.presentation

import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppResult
import com.fab.wab.customer.core.domain.AppSettings
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.auth.AuthTokens
import com.fab.wab.customer.core.domain.config.AppConfig
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.domain.config.ContactInfo
import com.fab.wab.customer.core.domain.config.MaintenancePolicy
import com.fab.wab.customer.core.domain.config.OtpConfig
import com.fab.wab.customer.core.domain.config.UpdatePolicy
import com.fab.wab.customer.core.domain.config.UpdateStatus
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.domain.session.UserProfile
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionManager
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.auth.domain.model.AuthPurpose
import com.fab.wab.customer.feature.auth.domain.model.AuthSession
import com.fab.wab.customer.feature.auth.domain.model.InstallationInfo
import com.fab.wab.customer.feature.auth.domain.model.InstallationLink
import com.fab.wab.customer.feature.auth.domain.model.OtpPolicy
import com.fab.wab.customer.feature.auth.domain.model.PhoneCheck
import com.fab.wab.customer.feature.auth.domain.model.PhoneNumber
import com.fab.wab.customer.feature.auth.domain.model.RegisterRequest
import com.fab.wab.customer.feature.auth.domain.model.WrongAttemptResult
import com.fab.wab.customer.feature.auth.domain.repository.AuthRepository
import com.fab.wab.customer.feature.auth.domain.repository.InstallationsRepository
import com.fab.wab.customer.feature.profile.domain.model.CustomerAccount
import com.fab.wab.customer.feature.profile.domain.model.PresignedUpload
import com.fab.wab.customer.feature.profile.domain.repository.ProfileRepository
import com.fab.wab.customer.feature.profile.domain.repository.UploadsRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

val ACCOUNT = CustomerAccount("c1", "Sara", "Ali", "s@x.com", Gender.FEMALE, "+962790000000", null, true)
val GUEST = SessionState.Guest(GuestProfile("Sara", Gender.FEMALE))
val USER = SessionState.SignedIn(UserProfile("c1", "Sara", Gender.FEMALE))
val CONTACT = ContactInfo("+962790000001", "+962790000002", "help@wab.jo")

class ProfileRepoFake : ProfileRepository {
    var me: AppResult<CustomerAccount> = AppResult.Success(ACCOUNT)
    var deleted = false
    override suspend fun me(): AppResult<CustomerAccount> = me
    override suspend fun setAvatar(key: String): AppResult<CustomerAccount> = AppResult.Success(ACCOUNT.copy(avatarUrl = "cdn/$key"))
    override suspend fun deleteAvatar(): AppResult<CustomerAccount> = AppResult.Success(ACCOUNT)
    override suspend fun deleteAccount(): AppResult<String> {
        deleted = true
        return AppResult.Success("2026-11-18T10:00:00Z")
    }
}

class UploadsRepoFake : UploadsRepository {
    override suspend fun presign(purpose: String, contentType: String, size: Int): AppResult<PresignedUpload> =
        AppResult.Success(PresignedUpload("k1", "https://storage.example/k1", "PUT", emptyMap(), 1_000_000))
    override suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String): AppResult<Unit> = AppResult.Success(Unit)
    override suspend fun confirm(key: String): AppResult<String?> = AppResult.Success(null)
}

class SessionStoreFake(initial: SessionState) : SessionStore {
    val sessionState = MutableStateFlow(initial)
    val pushState = MutableStateFlow(true)
    val guestProfiles = mutableListOf<GuestProfile>()
    var signedOut = false
    override val state: Flow<SessionState> = sessionState
    override val onboardingSeen: Flow<Boolean> = MutableStateFlow(true)
    override val pushEnabled: Flow<Boolean> = pushState
    override suspend fun tokens(): AuthTokens? = AuthTokens("a", "r")
    override suspend fun signIn(tokens: AuthTokens, user: UserProfile) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateUser(user: UserProfile) = Unit
    override suspend fun setOnboardingSeen(seen: Boolean) = Unit
    override suspend fun setGuestProfile(profile: GuestProfile) {
        guestProfiles += profile
        sessionState.value = SessionState.Guest(profile)
    }
    override suspend fun setPushEnabled(enabled: Boolean) { pushState.value = enabled }
    override suspend fun signOut() {
        signedOut = true
        sessionState.value = SessionState.Guest()
    }
    override suspend fun clearAll() = Unit
}

class SettingsFake : AppSettings {
    val languageState = MutableStateFlow(AppLanguage.ARABIC.code)
    val themeState = MutableStateFlow(ThemeMode.SYSTEM)
    private val text = MutableStateFlow<String?>(null)
    override val language: Flow<String> = languageState
    override val themeMode: Flow<ThemeMode> = themeState
    override val token: Flow<String?> = text
    override val fcmToken: Flow<String?> = text
    override val refreshToken: Flow<String?> = text
    override val userId: Flow<String?> = text
    override val userRole: Flow<String?> = text
    override val userName: Flow<String?> = text
    override val onboardingCompleted: Flow<Boolean> = MutableStateFlow(false)
    override val lastSyncTimestamp: Flow<Long?> = MutableStateFlow(null)
    override val deviceId: Flow<String?> = text
    override suspend fun setLanguage(language: String) { languageState.value = language }
    override suspend fun setThemeMode(mode: ThemeMode) { themeState.value = mode }
    override suspend fun setToken(token: String?) = Unit
    override suspend fun setFcmToken(fcmToken: String?) = Unit
    override suspend fun setRefreshToken(token: String?) = Unit
    override suspend fun setUserId(id: String?) = Unit
    override suspend fun setUserRole(role: String?) = Unit
    override suspend fun setUserName(name: String?) = Unit
    override suspend fun setOnboardingCompleted(completed: Boolean) = Unit
    override suspend fun setLastSyncTimestamp(timestamp: Long) = Unit
    override suspend fun setDeviceId(id: String?) = Unit
    override suspend fun clearAll() = Unit
    override suspend fun clearSession() = Unit
}

class ConfigFake : AppConfigRepository {
    private val config = AppConfig(
        update = UpdatePolicy(UpdateStatus.OK, storeUrl = "https://store.example/wab"),
        maintenance = MaintenancePolicy(false, null),
        nearbyRadiusKm = 5.0,
        otp = OtpConfig(6, 60),
        contact = CONTACT,
    )
    override val current: StateFlow<AppConfig?> = MutableStateFlow(config)
    override suspend fun refresh(): AppResult<AppConfig> = AppResult.Success(config)
}

class PermissionsFake(var status: PermissionStatus = PermissionStatus.GRANTED) : PermissionManager {
    val requests = mutableListOf<AppPermission>()
    override suspend fun status(permission: AppPermission): PermissionStatus = status
    override suspend fun request(permission: AppPermission): PermissionStatus {
        requests += permission
        return status
    }
    override fun openSettings(permission: AppPermission) = Unit
    override fun isLocationServiceEnabled(): Boolean = true
    override fun openLocationServiceSettings() = Unit
}

class AuthRepoFake : AuthRepository {
    var logouts = 0
    override suspend fun checkPhone(phone: PhoneNumber, purpose: AuthPurpose): AppResult<PhoneCheck> = AppResult.Loading
    override suspend fun requestOtp(phoneE164: String, purpose: AuthPurpose): AppResult<OtpPolicy> = AppResult.Loading
    override suspend fun reportWrongAttempt(phoneE164: String): AppResult<WrongAttemptResult> = AppResult.Loading
    override suspend fun login(phone: PhoneNumber, idToken: String, installation: InstallationInfo?): AppResult<AuthSession> = AppResult.Loading
    override suspend fun register(request: RegisterRequest, installation: InstallationInfo?): AppResult<AuthSession> = AppResult.Loading
    override suspend fun logout(refreshToken: String): AppResult<Unit> {
        logouts++
        return AppResult.Success(Unit)
    }
}

class InstallationsFake : InstallationsRepository {
    val pushUpdates = mutableListOf<Boolean>()
    override suspend fun register(info: InstallationInfo, language: String): AppResult<InstallationLink> = AppResult.Success(InstallationLink("i", true))
    override suspend fun setPushEnabled(enabled: Boolean): AppResult<Unit> {
        pushUpdates += enabled
        return AppResult.Success(Unit)
    }
}
