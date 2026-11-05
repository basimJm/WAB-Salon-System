package com.fab.wab.merchant.app.push

import com.fab.wab.merchant.core.domain.session.SessionState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.conflate
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.emptyFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.flow.onStart

/**
 * Keeps this device's installation (and so its FCM token) registered for the signed-in member (MER-092). The token
 * used to reach the backend only inside the login call: a token Firebase issued or rotated later left the backend
 * pushing to a dead token, and a new booking request never arrived while the app was in the background.
 *
 * While a member is signed in it runs [sync] (`PUT /installations`) once when the app starts or the member signs in,
 * and again for every token in [tokenUpdates]; the relay replays the latest token, so a start with a known token
 * syncs twice (the PUT is idempotent). A guest never syncs, and signing out cancels a sync still in flight.
 */
class InstallationSync(
    private val session: Flow<SessionState>,
    private val tokenUpdates: Flow<String>,
    private val sync: suspend () -> Unit,
) {
    @OptIn(ExperimentalCoroutinesApi::class)
    fun start(scope: CoroutineScope): Job =
        session.map { it.isSignedIn }
            .distinctUntilChanged()
            .flatMapLatest { signedIn -> if (signedIn) syncWhileSignedIn() else emptyFlow() }
            .launchIn(scope)

    /** Inside the `flatMapLatest` branch, so signing out cancels a sync in flight; a token that arrives meanwhile syncs next. */
    private fun syncWhileSignedIn(): Flow<Unit> =
        tokenUpdates.map { }.onStart { emit(Unit) }.conflate().onEach { sync() }
}
