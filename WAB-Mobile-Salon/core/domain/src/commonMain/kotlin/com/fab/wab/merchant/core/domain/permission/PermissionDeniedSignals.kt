package com.fab.wab.merchant.core.domain.permission

import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.ErrorCode
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * A server answer of `FORBIDDEN` / `PERMISSION_DENIED` means the cached permissions are stale (PRD §3: the owner
 * changed them while this screen was open). The network layer reports it here; the shell re-fetches the
 * permissions so the feature disappears (hidden, not disabled). A burst of refusals collapses into one signal.
 */
object PermissionDeniedSignals {
    private val denied = MutableSharedFlow<Unit>(extraBufferCapacity = 1, onBufferOverflow = BufferOverflow.DROP_OLDEST)

    val events: SharedFlow<Unit> get() = denied.asSharedFlow()

    fun report(error: AppError) {
        if (error.isPermissionRefusal()) denied.tryEmit(Unit)
    }
}

/** True for the two codes that mean "this member may no longer do this". */
fun AppError.isPermissionRefusal(): Boolean =
    this is AppError.ServerError && (code == ErrorCode.FORBIDDEN || code == ErrorCode.PERMISSION_DENIED)
