package com.fab.wab.merchant.feature.application.domain

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.auth.AuthTokens
import com.fab.wab.merchant.core.domain.permission.Permission
import com.fab.wab.merchant.core.domain.session.MemberProfile
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.feature.application.domain.model.RegistrationForm
import com.fab.wab.merchant.feature.application.domain.model.SalonApplication
import com.fab.wab.merchant.feature.application.domain.model.SalonGender
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationRepository
import com.fab.wab.merchant.feature.application.domain.repository.ApplicationSession
import com.fab.wab.merchant.feature.application.domain.usecase.GetApplicationUseCase
import com.fab.wab.merchant.feature.application.domain.usecase.ResubmitApplicationUseCase
import com.fab.wab.merchant.feature.application.domain.usecase.SubmitApplicationUseCase
import com.fab.wab.merchant.feature.auth.domain.model.AuthPurpose
import com.fab.wab.merchant.feature.auth.domain.model.InstallationInfo
import com.fab.wab.merchant.feature.auth.domain.model.OtpVerified
import com.fab.wab.merchant.feature.auth.domain.model.PhoneNumber
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

internal val PENDING = SalonApplication("s1", SalonState.APPLICATION_PENDING, null, 0, null)
internal val OWNER = MemberProfile("m1", "s1", "Lina", MemberRole.OWNER)
internal val OWNER_KEYS = Permission.entries.map { it.name }.toSet()
internal val FORM = RegistrationForm("Lina Beauty", SalonGender.WOMEN, "Lina", "Haddad", "c1", "a1", listOf("l/1.pdf"))

internal class FakeApplications : ApplicationRepository {
    var applyResult: AppResult<ApplicationSession> = AppResult.Success(ApplicationSession(AuthTokens("a", "r"), OWNER, OWNER_KEYS, PENDING))
    var currentResult: AppResult<SalonApplication> = AppResult.Success(PENDING)
    var resubmitResult: AppResult<SalonApplication> = AppResult.Success(PENDING)
    val applied = mutableListOf<Pair<RegistrationForm, String>>()
    val resubmitted = mutableListOf<RegistrationForm>()

    override suspend fun apply(form: RegistrationForm, phone: PhoneNumber, idToken: String, installation: InstallationInfo?) =
        applyResult.also { applied += form to idToken }

    override suspend fun current() = currentResult

    override suspend fun resubmit(form: RegistrationForm) = resubmitResult.also { resubmitted += form }
}

internal class RecordingSessionStore : SessionStore {
    var member: MemberProfile? = null
    var permissions: Set<String> = emptySet()
    var salonState: SalonState? = null
    override val state: Flow<SessionState> = MutableStateFlow(SessionState.Guest)
    override val pushEnabled: Flow<Boolean> = MutableStateFlow(true)
    override val overlayPermissionPrompted: Flow<Boolean> = MutableStateFlow(false)
    override suspend fun tokens(): AuthTokens? = null
    override suspend fun signIn(tokens: AuthTokens, member: MemberProfile, permissions: Set<String>, salonState: SalonState?) {
        this.member = member
        this.permissions = permissions
        this.salonState = salonState
    }
    override suspend fun updateTokens(tokens: AuthTokens) = Unit
    override suspend fun updateMember(member: MemberProfile) = Unit
    override suspend fun updatePermissions(permissions: Set<String>) = Unit
    override suspend fun updateSalonState(salonState: SalonState?) {
        this.salonState = salonState
    }
    override suspend fun setPushEnabled(enabled: Boolean) = Unit
    override suspend fun setOverlayPermissionPrompted(prompted: Boolean) = Unit
    override suspend fun signOut() = Unit
    override suspend fun clearAll() = Unit
}

class ApplicationUseCasesTest {
    private val repository = FakeApplications()
    private val session = RecordingSessionStore()
    private val proof = OtpVerified(AuthPurpose.REGISTER, PhoneNumber("JO", "791234567"), "proof")

    @Test
    fun submitSignsTheOwnerInWithTheServerMemberAndPermissionsAndThePendingState() = runTest {
        SubmitApplicationUseCase(repository, { null }, session)(FORM, proof)
        assertEquals(listOf(FORM to "proof"), repository.applied)
        assertEquals(OWNER, session.member)
        assertEquals(OWNER_KEYS, session.permissions)
        assertEquals(SalonState.APPLICATION_PENDING, session.salonState)
    }

    @Test
    fun submitUsesTheServerAnswerNotTheForm() = runTest {
        // MER-068: the session follows what the server stored (contract 1.4.0 `member` = MemberProfile), not local guesses.
        val stored = OWNER.copy(firstName = "Server Lina")
        repository.applyResult = AppResult.Success(ApplicationSession(AuthTokens("a", "r"), stored, setOf("DASHBOARD_VIEW"), PENDING))
        SubmitApplicationUseCase(repository, { null }, session)(FORM, proof)
        assertEquals("Server Lina", session.member?.firstName)
        assertEquals(setOf("DASHBOARD_VIEW"), session.permissions)
    }

    @Test
    fun aFailedSubmitKeepsTheGuest() = runTest {
        repository.applyResult = AppResult.Error(AppError.NetworkError("offline"))
        SubmitApplicationUseCase(repository, { null }, session)(FORM, proof)
        assertNull(session.member)
    }

    @Test
    fun statusAndResubmitUpdateTheCachedSalonState() = runTest {
        repository.currentResult = AppResult.Success(PENDING.copy(state = SalonState.APPLICATION_REJECTED, rejectionReason = "blurry"))
        GetApplicationUseCase(repository, session)()
        assertEquals(SalonState.APPLICATION_REJECTED, session.salonState)
        ResubmitApplicationUseCase(repository, session)(FORM)
        assertEquals(SalonState.APPLICATION_PENDING, session.salonState)
        assertEquals(listOf(FORM), repository.resubmitted)
    }
}
