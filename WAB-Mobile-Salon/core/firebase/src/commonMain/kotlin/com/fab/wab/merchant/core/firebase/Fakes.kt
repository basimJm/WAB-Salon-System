package com.fab.wab.merchant.core.firebase

import kotlinx.coroutines.flow.SharedFlow

/** Scriptable phone auth for tests, previews and builds without Firebase (every outcome is a value you set). */
class FakePhoneAuthGateway(
    var startResult: FirebaseResult<PhoneVerification> = FirebaseResult.Success(PhoneVerification(DEFAULT_VERIFICATION_ID)),
    var confirmResult: FirebaseResult<String> = FirebaseResult.Success(DEFAULT_PROOF),
) : PhoneAuthGateway {
    val startedPhones = mutableListOf<String>()
    val confirmedCodes = mutableListOf<String>()
    var signedOut = 0
        private set

    override suspend fun startVerification(phoneE164: String): FirebaseResult<PhoneVerification> {
        startedPhones += phoneE164
        return startResult
    }

    override suspend fun confirm(verification: PhoneVerification, code: String): FirebaseResult<String> {
        confirmedCodes += code
        return confirmResult
    }

    override suspend fun signOut() {
        signedOut += 1
    }

    companion object {
        const val DEFAULT_VERIFICATION_ID = "fake-verification"
        const val DEFAULT_PROOF = "fake-proof"
    }
}

class FakePushTokenProvider(var token: String? = null) : PushTokenProvider {
    override suspend fun currentToken(): String? = token
    override val tokenUpdates: SharedFlow<String> get() = PushTokenRelay.tokenUpdates
}

class FakeCrashReporter : CrashReporter {
    val logs = mutableListOf<String>()
    val nonFatals = mutableListOf<Throwable>()
    var userId: String? = null
        private set

    override fun log(message: String) {
        logs += message
    }

    override fun recordNonFatal(throwable: Throwable) {
        nonFatals += throwable
    }

    override fun setUserId(userId: String?) {
        this.userId = userId
    }
}

class FakeAppInstanceIdProvider(var id: String? = DEFAULT_APP_INSTANCE_ID) : AppInstanceIdProvider {
    override suspend fun appInstanceId(): String? = id

    companion object {
        const val DEFAULT_APP_INSTANCE_ID = "fake-app-instance"
    }
}
