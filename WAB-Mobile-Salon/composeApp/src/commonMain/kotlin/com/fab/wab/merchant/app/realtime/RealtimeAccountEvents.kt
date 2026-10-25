package com.fab.wab.merchant.app.realtime

import com.fab.wab.merchant.core.domain.permission.PermissionDeniedSignals
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.session.SessionState
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import com.fab.wab.merchant.core.realtime.RealtimeStatus
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.filterNotNull
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import kotlinx.coroutines.launch

/**
 * Account events of the member room (BUSINESS_DOMAIN §7): `permissions.updated` re-fetches the permissions,
 * `access.revoked` signs out and tells the shell (PRD §4.3 "Your access was removed by the salon owner").
 * A `FORBIDDEN` / `PERMISSION_DENIED` answer from any call ([denied]) re-fetches the permissions too, so the
 * refused feature hides itself.
 */
class RealtimeAccountEvents(
    private val client: RealtimeClient,
    private val permissionsSync: PermissionsSync,
    private val sessionStore: SessionStore,
    private val denied: Flow<Unit> = PermissionDeniedSignals.events,
) {
    fun start(scope: CoroutineScope, onAccessRevoked: () -> Unit): Job = scope.launch {
        denied.onEach { permissionsSync.refresh() }.launchIn(this)
        reconnectOnScopeChange(this)
        accountEvents(this, onAccessRevoked)
    }

    /**
     * MER-066 (BUSINESS_DOMAIN §7): the server joins the `salon:` / `branch:` rooms when the socket connects, so a member
     * moved to another branch (or promoted to owner) reconnects to get the new rooms. Only a live connection is renewed.
     */
    private fun reconnectOnScopeChange(scope: CoroutineScope): Job =
        sessionStore.state
            .map { state -> (state as? SessionState.SignedIn)?.member?.let { it.id to it.scope } }
            .distinctUntilChanged()
            .drop(1)
            .filterNotNull()
            .onEach {
                if (client.status.value != RealtimeStatus.Disconnected) {
                    client.disconnect()
                    client.connect()
                }
            }
            .launchIn(scope)

    private fun accountEvents(scope: CoroutineScope, onAccessRevoked: () -> Unit): Job = client.events.onEach { event ->
        when (event.name) {
            RealtimeEvents.PERMISSIONS_UPDATED -> permissionsSync.refresh()
            RealtimeEvents.ACCESS_REVOKED -> {
                sessionStore.signOut()
                onAccessRevoked()
            }
        }
    }.launchIn(scope)
}
