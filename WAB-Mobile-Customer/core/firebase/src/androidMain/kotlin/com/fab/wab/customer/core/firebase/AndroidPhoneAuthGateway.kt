package com.fab.wab.customer.core.firebase

import android.app.Activity
import com.google.firebase.FirebaseException
import com.google.firebase.FirebaseNetworkException
import com.google.firebase.FirebaseTooManyRequestsException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseAuthInvalidCredentialsException
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import kotlinx.coroutines.suspendCancellableCoroutine
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume

/** The foreground Activity Firebase needs to show reCAPTCHA / Play Integrity; `MainActivity` keeps it current. */
fun interface CurrentActivityProvider {
    fun current(): Activity?
}

private const val VERIFICATION_TIMEOUT_SECONDS = 60L
private const val AUTO_VERIFIED_ID = "auto-verified"

class AndroidPhoneAuthGateway(
    private val activityProvider: CurrentActivityProvider,
    private val auth: FirebaseAuth = FirebaseAuth.getInstance(),
) : PhoneAuthGateway {

    private var resend: ResendHandle? = null

    override suspend fun startVerification(phoneE164: String): FirebaseResult<PhoneVerification> {
        val activity = activityProvider.current() ?: return FirebaseResult.Failure(FirebaseFailure.Unavailable)
        return suspendCancellableCoroutine { continuation ->
            val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onCodeSent(verificationId: String, token: PhoneAuthProvider.ForceResendingToken) {
                    resend = ResendHandle(phoneE164, token)
                    if (continuation.isActive) continuation.resume(FirebaseResult.Success(PhoneVerification(verificationId)))
                }

                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    if (!continuation.isActive) return
                    auth.signInWithCredential(credential).addOnCompleteListener { task ->
                        val user = task.result?.user
                        if (task.isSuccessful && user != null) {
                            user.getIdToken(false).addOnCompleteListener { tokenTask ->
                                val token = tokenTask.result?.token
                                continuation.resume(
                                    if (token != null) {
                                        FirebaseResult.Success(PhoneVerification(AUTO_VERIFIED_ID, token))
                                    } else {
                                        FirebaseResult.Failure(FirebaseFailure.Unknown(tokenTask.exception?.message))
                                    },
                                )
                            }
                        } else {
                            continuation.resume(FirebaseResult.Failure(task.exception.toFailure(PhoneAuthStage.Start)))
                        }
                    }
                }

                override fun onVerificationFailed(exception: FirebaseException) {
                    if (continuation.isActive) continuation.resume(FirebaseResult.Failure(exception.toFailure(PhoneAuthStage.Start)))
                }
            }
            val builder = PhoneAuthOptions.newBuilder(auth)
                .setPhoneNumber(phoneE164)
                .setTimeout(VERIFICATION_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .setActivity(activity)
                .setCallbacks(callbacks)
            // "Resend code" for the same number reuses Firebase's resend token (no new reCAPTCHA / Play Integrity round).
            resend?.takeIf { it.phoneE164 == phoneE164 }?.let { builder.setForceResendingToken(it.token) }
            val options = builder.build()
            PhoneAuthProvider.verifyPhoneNumber(options)
        }
    }

    override suspend fun confirm(verification: PhoneVerification, code: String): FirebaseResult<String> {
        verification.autoVerifiedIdToken?.let { return FirebaseResult.Success(it) }
        return try {
            val credential = PhoneAuthProvider.getCredential(verification.id, code)
            val user = auth.signInWithCredential(credential).awaitResult().user
                ?: return FirebaseResult.Failure(FirebaseFailure.Unknown(null))
            val token = user.getIdToken(false).awaitResult().token
            if (token != null) FirebaseResult.Success(token) else FirebaseResult.Failure(FirebaseFailure.Unknown(null))
        } catch (expected: FirebaseException) {
            FirebaseResult.Failure(expected.toFailure(PhoneAuthStage.Confirm))
        }
    }

    override suspend fun signOut() {
        resend = null
        auth.signOut()
    }
}

/** Firebase Android reports problems as exception types; the stage disambiguates invalid phone vs invalid code. */
internal fun Throwable?.toFailure(stage: PhoneAuthStage): FirebaseFailure = when (this) {
    is FirebaseAuthInvalidCredentialsException ->
        if (stage == PhoneAuthStage.Start) FirebaseFailure.InvalidPhone else FirebaseFailure.InvalidCode
    is FirebaseTooManyRequestsException -> FirebaseFailure.TooManyRequests
    is FirebaseNetworkException -> FirebaseFailure.Network
    else -> FirebaseFailure.Unknown(this?.message)
}

/** Firebase's resend token for the last number a code was sent to. */
private data class ResendHandle(val phoneE164: String, val token: PhoneAuthProvider.ForceResendingToken)
