package com.fab.wab.merchant.feature.more.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.locations.Area
import com.fab.wab.merchant.core.domain.locations.City
import com.fab.wab.merchant.core.domain.locations.Country
import com.fab.wab.merchant.core.domain.locations.LocationsRepository
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.domain.upload.ConfirmedUpload
import com.fab.wab.merchant.core.domain.upload.PresignedUpload
import com.fab.wab.merchant.core.domain.upload.UploadFileUseCase
import com.fab.wab.merchant.core.domain.upload.UploadPurpose
import com.fab.wab.merchant.core.domain.upload.UploadsRepository
import com.fab.wab.merchant.core.ui.media.CropRegion
import com.fab.wab.merchant.core.ui.media.FakeFilePicker
import com.fab.wab.merchant.core.ui.media.FakeImageCropper
import com.fab.wab.merchant.core.ui.media.PickedFile
import com.fab.wab.merchant.core.ui.media.PickedImage
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import com.fab.wab.merchant.feature.auth.domain.repository.PendingOtpVerification
import com.fab.wab.merchant.feature.more.domain.AccountField
import com.fab.wab.merchant.feature.more.domain.PhotoChange
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.SideEffect
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MyAccountDependencies
import com.fab.wab.merchant.feature.more.presentation.controller.vm.MyAccountViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private val JORDAN = Country("JO", "Jordan", "+962", null, "^7[789]\\d{7}$")

private class MemberSession : SessionStore {
    val member = MutableStateFlow(MemberProfile("m", "s", "Old", MemberRole.OWNER))
    private val stateFlow = MutableStateFlow<SessionState>(SessionState.SignedIn(member.value))
    override val state: Flow<SessionState> = stateFlow
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override val overlayPermissionPrompted: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) = Unit
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) {
        this.member.value = member
        stateFlow.value = SessionState.SignedIn(member)
    }
    override suspend fun updatePermissions(permissions: Set<String>) = Unit
    override suspend fun updateSalonState(salonState: SalonState?) = Unit
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

private class OneCountry : LocationsRepository {
    override suspend fun countries(refresh: Boolean): AppResult<List<Country>> = AppResult.Success(listOf(JORDAN))
    override suspend fun cities(countryCode: String, refresh: Boolean): AppResult<List<City>> = AppResult.Success(emptyList())
    override suspend fun areas(cityId: String, refresh: Boolean): AppResult<List<Area>> = AppResult.Success(emptyList())
}

private class Uploads : UploadsRepository {
    override suspend fun presign(purpose: UploadPurpose, contentType: String, size: Long): AppResult<PresignedUpload> =
        AppResult.Success(PresignedUpload("${purpose.name}-key", "u", "PUT", emptyMap(), size))
    override suspend fun upload(target: PresignedUpload, bytes: ByteArray, contentType: String, onProgress: (Float) -> Unit): AppResult<Unit> =
        AppResult.Success(Unit)
    override suspend fun confirm(purpose: UploadPurpose, key: String): AppResult<ConfirmedUpload> =
        AppResult.Success(ConfirmedUpload(key, "https://cdn/$key"))
}

@OptIn(ExperimentalCoroutinesApi::class)
class MyAccountViewModelTest {

    private val account = FakeAccount()
    private val session = MemberSession()
    private val pending = PendingOtpVerification()

    private fun TestScope.viewModel() = MyAccountViewModel(
        MyAccountDependencies(
            account = account,
            session = session,
            locations = OneCountry(),
            picker = FakeFilePicker(media = listOf(PickedFile("p.jpg", byteArrayOf(1), "image/jpeg"))),
            cropper = FakeImageCropper(PickedImage(byteArrayOf(2), "image/jpeg")),
            upload = UploadFileUseCase(Uploads()),
            pending = pending,
            analytics = NoOpAnalyticsTracker,
            errorText = { "failed" },
        ),
        testScope = backgroundScope,
    ).also { vm -> backgroundScope.launch { vm.state.collect { } } }

    @Test
    fun loadsTheAccountAndSavesNamesAndANewPhoto() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        val loaded = viewModel.state.first { !it.loading }
        assertEquals("Huda", loaded.firstName)
        assertFalse(loaded.canSave)
        assertEquals("Huda", session.member.value.firstName, "session name follows the server")
        viewModel.onEvent(UiAction.OnFirstName(" "))
        viewModel.onEvent(UiAction.OnSave)
        assertEquals(setOf(AccountField.FIRST_NAME), viewModel.state.first().visibleErrors)
        assertTrue(account.calls.isEmpty())
        viewModel.onEvent(UiAction.OnFirstName("Layla"))
        viewModel.onEvent(UiAction.OnPickPhoto)
        viewModel.onEvent(UiAction.OnCropConfirm(CropRegion.FULL))
        assertEquals(PhotoChange.Set("MEMBER_PHOTO-key"), viewModel.state.first().photoChange)
        viewModel.onEvent(UiAction.OnSave)
        assertEquals("update:Layla:Saleh:${PhotoChange.Set("MEMBER_PHOTO-key")}", account.calls.last())
        assertEquals(listOf<SideEffect>(SideEffect.Saved), effects)
        assertEquals("Layla", session.member.value.firstName)
        assertFalse(viewModel.state.first().canSave)
        viewModel.onEvent(UiAction.OnRemovePhoto)
        assertNull(viewModel.state.first().photo)
        viewModel.onEvent(UiAction.OnSave)
        assertEquals("update:Layla:Saleh:${PhotoChange.Remove}", account.calls.last())
    }

    @Test
    fun changePhoneVerifiesTheNewNumberWithAnOtpThenUsesTheProofOnce() = runTest(UnconfinedTestDispatcher()) {
        val viewModel = viewModel()
        val effects = mutableListOf<SideEffect>().also { list -> backgroundScope.launch { viewModel.sideEffect.collect { list += it } } }
        viewModel.state.first { !it.loading }
        viewModel.onEvent(UiAction.OnChangePhone)
        assertEquals("JO", viewModel.state.first().phoneForm?.countryCode)
        viewModel.onEvent(UiAction.OnNumber("123"))
        viewModel.onEvent(UiAction.OnPhoneContinue)
        assertTrue(viewModel.state.first().phoneForm?.showError == true)
        viewModel.onEvent(UiAction.OnNumber("0791112223"))
        viewModel.onEvent(UiAction.OnPhoneContinue)
        assertEquals(SideEffect.VerifyPhone("JO", "791112223"), effects.single())
        viewModel.onEvent(UiAction.OnResume)
        assertTrue(account.calls.isEmpty(), "no proof: the member went back")
        viewModel.onEvent(UiAction.OnChangePhone)
        viewModel.onEvent(UiAction.OnNumber("791112223"))
        viewModel.onEvent(UiAction.OnPhoneContinue)
        pending.publish(OtpVerified(AuthPurpose.CHANGE_PHONE, PhoneNumber("JO", "791112223"), "token"))
        viewModel.onEvent(UiAction.OnResume)
        assertEquals("phone:JO:791112223:token", account.calls.last())
        assertEquals("+962791112223", viewModel.state.first().account?.phone)
        assertEquals(SideEffect.PhoneChanged, effects.last())
        viewModel.onEvent(UiAction.OnResume)
        assertEquals(1, account.calls.size, "a proof is used once")
    }
}
