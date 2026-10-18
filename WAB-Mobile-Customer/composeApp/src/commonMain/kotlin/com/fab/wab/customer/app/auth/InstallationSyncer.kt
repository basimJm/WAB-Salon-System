package com.fab.wab.customer.app.auth

import com.fab.wab.customer.core.domain.session.SessionState
import com.fab.wab.customer.feature.auth.domain.usecase.SyncInstallationUseCase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.drop
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.merge
import kotlinx.coroutines.flow.onStart
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** What makes the app re-register the device (PRD §10.2, §14). */
enum class InstallationTrigger { Launch, SessionChange, LanguageChange, PushTokenRefresh }

/**
 * Keeps `PUT /installations` current: at launch, when the session signs in or out (link / unlink), when the
 * language changes and whenever Firebase refreshes the push token. Calls are serialized; failures are silent and
 * the next trigger retries (nothing user-facing depends on it).
 */
class InstallationSyncer(
    private val sync: SyncInstallationUseCase,
    private val session: Flow<SessionState>,
    private val language: Flow<String>,
    private val pushTokens: Flow<String>,
) {
    private val lock = Mutex()
    private val history = mutableListOf<InstallationTrigger>()

    /** Triggers already acted on, in order (diagnostics and tests). */
    val performed: List<InstallationTrigger> get() = history.toList()

    fun start(scope: CoroutineScope): Job = scope.launch { triggers().collect { trigger -> perform(trigger) } }

    /** Pure composition of the trigger streams; the first session/language values are the launch, not a change. */
    fun triggers(): Flow<InstallationTrigger> = merge(
        session.map { it.isSignedIn }.distinctUntilChanged().drop(1).map { InstallationTrigger.SessionChange },
        language.distinctUntilChanged().drop(1).map { InstallationTrigger.LanguageChange },
        pushTokens.map { InstallationTrigger.PushTokenRefresh },
    ).onStart { emit(InstallationTrigger.Launch) }

    private suspend fun perform(trigger: InstallationTrigger) = lock.withLock {
        history += trigger
        sync()
    }
}
