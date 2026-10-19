package com.fab.wab.customer.feature.profile.presentation

import com.fab.wab.customer.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppLanguage
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.core.domain.session.Gender
import com.fab.wab.customer.core.domain.session.GuestProfile
import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.core.ui.external.FakeExternalActions
import com.fab.wab.customer.core.ui.media.FakeImagePicker
import com.fab.wab.customer.core.ui.media.ImageSource
import com.fab.wab.customer.core.ui.media.PickedImage
import com.fab.wab.customer.core.ui.permission.AppPermission
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.core.ui.permission.PermissionStatus
import com.fab.wab.customer.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.SetPushEnabledUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.DeleteAccountUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.DeleteAvatarUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.LoadProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UpdateGuestProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UploadAvatarUseCase
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ContactChannel
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.SideEffect
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileLink
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileOverlay
import com.fab.wab.customer.feature.profile.presentation.controller.vm.ContentSlugs
import com.fab.wab.customer.feature.profile.presentation.controller.vm.ProfileDependencies
import com.fab.wab.customer.feature.profile.presentation.controller.vm.ProfileViewModel
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

@OptIn(ExperimentalCoroutinesApi::class)
class ProfileViewModelTest {

    private val effects = mutableListOf<SideEffect>()
    private val profile = ProfileRepoFake()
    private val settings = SettingsFake()
    private val external = FakeExternalActions()
    private val picker = FakeImagePicker()
    private val permissions = PermissionsFake()
    private val auth = AuthRepoFake()
    private val installations = InstallationsFake()
    private lateinit var session: SessionStoreFake

    private fun TestScope.viewModel(initial: SessionState): ProfileViewModel {
        session = SessionStoreFake(initial)
        val deps = ProfileDependencies(
            sessionStore = session,
            appearance = AppearanceSettings(settings),
            config = ConfigFake(),
            environment = AppEnvironment("dev", "https://api.example", "https://web.example", "1.2.3", 7, isDebug = true),
            loadProfile = LoadProfileUseCase(profile),
            uploadAvatar = UploadAvatarUseCase(UploadsRepoFake(), profile),
            deleteAvatar = DeleteAvatarUseCase(profile),
            deleteAccount = DeleteAccountUseCase(profile, session),
            updateGuest = UpdateGuestProfileUseCase(session),
            logout = LogoutUseCase(auth, session),
            setPushEnabled = SetPushEnabledUseCase(installations, session),
            imagePicker = picker,
            permissions = PermissionFlow(permissions),
            external = external,
            analytics = NoOpAnalyticsTracker,
            errorText = { "error" },
        )
        val vm = ProfileViewModel(deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        backgroundScope.launch { vm.sideEffect.collect { effects += it } }
        vm.onStart()
        return vm
    }

    @Test
    fun guestLayoutEditsNicknameAndGenderLocally() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(GUEST)
        assertFalse(vm.state.value.signedIn)
        assertEquals("Sara", vm.state.value.guestNickname)
        assertEquals("1.2.3", vm.state.value.appVersion)
        vm.onEvent(UiAction.OnEditGuestClick)
        vm.onEvent(UiAction.OnGuestNicknameChange("Lina"))
        vm.onEvent(UiAction.OnGuestGenderSelect(Gender.MALE))
        vm.onEvent(UiAction.OnGuestSave)
        assertEquals(GuestProfile("Lina", Gender.MALE), session.guestProfiles.single())
        assertEquals("Lina", vm.state.value.guestNickname)
        assertNull(vm.state.value.overlay)
        vm.onEvent(UiAction.OnLoginClick)
        assertEquals<SideEffect>(SideEffect.OpenLogin, effects.single())
    }

    @Test
    fun settingsRowsChangeLanguageThemeAndPush() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(USER)
        vm.onEvent(UiAction.OnLanguageSelect(AppLanguage.ENGLISH))
        vm.onEvent(UiAction.OnThemeSelect(ThemeMode.DARK))
        vm.onEvent(UiAction.OnPushToggle(false))
        assertEquals(AppLanguage.ENGLISH, vm.state.value.language)
        assertEquals(ThemeMode.DARK, vm.state.value.themeMode)
        assertFalse(vm.state.value.pushEnabled)
        assertEquals(listOf(false), installations.pushUpdates)
        permissions.status = PermissionStatus.DENIED
        vm.onEvent(UiAction.OnPushToggle(true))
        assertEquals(listOf(AppPermission.NOTIFICATIONS), permissions.requests, "enabling asks the OS permission once")
        assertEquals(listOf(false, true), installations.pushUpdates)
    }

    @Test
    fun registeredPhotoFlowUploadsFromGalleryAndRespectsCameraPermission() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(USER)
        assertEquals(ACCOUNT, vm.state.value.account)
        picker.result = PickedImage(ByteArray(3), "image/jpeg")
        vm.onEvent(UiAction.OnPhotoClick)
        assertEquals(ProfileOverlay.PhotoOptions, vm.state.value.overlay)
        vm.onEvent(UiAction.OnPhotoSourceSelect(ImageSource.GALLERY))
        assertEquals("cdn/k1", vm.state.value.account?.avatarUrl)
        assertTrue(vm.state.value.hasPhoto)
        permissions.status = PermissionStatus.DENIED
        vm.onEvent(UiAction.OnPhotoSourceSelect(ImageSource.CAMERA))
        assertEquals(listOf(ImageSource.GALLERY), picker.requests)
        vm.onEvent(UiAction.OnPhotoDelete)
        assertFalse(vm.state.value.hasPhoto)
    }

    @Test
    fun supportLinksUseConfigAndExternalApps() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(GUEST)
        vm.onEvent(UiAction.OnContactChannel(ContactChannel.WHATSAPP))
        vm.onEvent(UiAction.OnLinkClick(ProfileLink.RATE_APP))
        vm.onEvent(UiAction.OnLinkClick(ProfileLink.REGISTER_SALON))
        vm.onEvent(UiAction.OnLinkClick(ProfileLink.PRIVACY))
        vm.onEvent(UiAction.OnLinkClick(ProfileLink.FAQ))
        assertEquals(
            listOf("https://wa.me/962790000002", "url:https://store.example/wab", "url:https://web.example/merchants/register"),
            external.calls,
        )
        assertEquals(listOf(SideEffect.OpenContent(ContentSlugs.PRIVACY), SideEffect.OpenFaq), effects)
    }

    @Test
    fun logoutAndDeleteAccountReturnToGuest() = runTest(UnconfinedTestDispatcher()) {
        val vm = viewModel(USER)
        vm.onEvent(UiAction.OnLogoutClick)
        assertEquals(ProfileOverlay.LogoutConfirm, vm.state.value.overlay)
        vm.onEvent(UiAction.OnLogoutConfirm)
        assertEquals(1, auth.logouts)
        assertFalse(vm.state.value.signedIn)
        assertEquals<SideEffect>(SideEffect.LoggedOut, effects.last())
        session.sessionState.value = USER
        vm.onEvent(UiAction.OnDeleteAccountClick)
        vm.onEvent(UiAction.OnDeleteAccountConfirm)
        assertTrue(profile.deleted)
        assertFalse(vm.state.value.signedIn)
        assertEquals<SideEffect>(SideEffect.AccountDeleted, effects.last())
    }
}
