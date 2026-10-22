package com.fab.wab.merchant.core.firebase

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
        val activity = activityProvider.current()
        val reuseResend = resend?.phoneE164 == phoneE164
        PhoneAuthLog.info(
            "start phone=${PhoneAuthLog.mask(phoneE164)} activity=${activity?.javaClass?.simpleName} " +
                "timeoutSec=$VERIFICATION_TIMEOUT_SECONDS resendToken=$reuseResend app=${auth.app.options.projectId}",
        )
        if (activity == null) {
            PhoneAuthLog.info("start ABORTED: no foreground Activity (Firebase needs it for reCAPTCHA / Play Integrity)")
            return FirebaseResult.Failure(FirebaseFailure.Unavailable)
        }
        val startedAt = System.currentTimeMillis()
        return suspendCancellableCoroutine { continuation ->
            val callbacks = object : PhoneAuthProvider.OnVerificationStateChangedCallbacks() {
                override fun onCodeSent(verificationId: String, token: PhoneAuthProvider.ForceResendingToken) {
                    resend = ResendHandle(phoneE164, token)
                    PhoneAuthLog.info(
                        "codeSent verificationId=${PhoneAuthLog.preview(verificationId)} " +
                            "afterMs=${System.currentTimeMillis() - startedAt} — Firebase accepted the request and handed the " +
                            "SMS to its carrier; if it never arrives check Authentication → Usage, the SMS region policy, " +
                            "billing (Blaze) and whether the number is a test number (test numbers never get an SMS)",
                    )
                    if (continuation.isActive) continuation.resume(FirebaseResult.Success(PhoneVerification(verificationId)))
                }

                override fun onCodeAutoRetrievalTimeOut(verificationId: String) {
                    PhoneAuthLog.info(
                        "autoRetrievalTimeout verificationId=${PhoneAuthLog.preview(verificationId)} — this device did not " +
                            "read the SMS by itself (normal when the SMS goes to another phone); the user types the code",
                    )
                }

                override fun onVerificationCompleted(credential: PhoneAuthCredential) {
                    PhoneAuthLog.info("verificationCompleted (instant / auto-retrieved) smsCodePresent=${credential.smsCode != null}")
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
                    PhoneAuthLog.failure("verifyPhoneNumber", exception)
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
            PhoneAuthLog.info("verifyPhoneNumber requested")
            val options = builder.build()
            PhoneAuthProvider.verifyPhoneNumber(options)
        }
    }

    override suspend fun confirm(verification: PhoneVerification, code: String): FirebaseResult<String> {
        verification.autoVerifiedIdToken?.let {
            PhoneAuthLog.info("confirm skipped: already auto-verified")
            return FirebaseResult.Success(it)
        }
        PhoneAuthLog.info("confirm verificationId=${PhoneAuthLog.preview(verification.id)} codeLength=${code.length}")
        return try {
            val credential = PhoneAuthProvider.getCredential(verification.id, code)
            val user = auth.signInWithCredential(credential).awaitResult().user
                ?: return FirebaseResult.Failure(FirebaseFailure.Unknown(null))
            val token = user.getIdToken(false).awaitResult().token
            PhoneAuthLog.info("confirm OK uid=${PhoneAuthLog.preview(user.uid)} idToken=${token != null}")
            if (token != null) FirebaseResult.Success(token) else FirebaseResult.Failure(FirebaseFailure.Unknown(null))
        } catch (expected: FirebaseException) {
            PhoneAuthLog.failure("confirm", expected)
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
