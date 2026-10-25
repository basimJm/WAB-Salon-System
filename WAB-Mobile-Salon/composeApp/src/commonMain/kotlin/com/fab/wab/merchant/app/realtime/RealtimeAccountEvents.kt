package com.fab.wab.merchant.app.realtime

import com.fab.wab.merchant.core.domain.permission.PermissionDeniedSignals
import com.fab.wab.merchant.core.domain.permission.PermissionsSync
import com.fab.wab.merchant.core.domain.session.SessionStore
import com.fab.wab.merchant.core.realtime.RealtimeClient
import com.fab.wab.merchant.core.realtime.RealtimeEvents
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.launchIn
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
        accountEvents(this, onAccessRevoked)
    }

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
