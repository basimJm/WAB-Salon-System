package com.fab.wab.merchant.app.controller

import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.config.AppConfig
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.config.MaintenancePolicy
import com.fab.wab.merchant.core.domain.config.OtpConfig
import com.fab.wab.merchant.core.domain.config.UpdatePolicy
import com.fab.wab.merchant.core.domain.config.UpdateStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

internal const val STORE_URL = "https://store.example/wab-business"

internal val READY_CONFIG = AppConfig(
    update = UpdatePolicy(UpdateStatus.OK, storeUrl = STORE_URL),
    maintenance = MaintenancePolicy(enabled = false),
    nearbyRadiusKm = 5.0,
    otp = OtpConfig(length = 6, resendAfterSeconds = 60),
)

/** Answers [results] in order (the last one repeats); counts the calls. */
internal class FakeAppConfigRepository(vararg results: AppResult<AppConfig>) : AppConfigRepository {
    private val answers = results.toMutableList()
    private val state = MutableStateFlow<AppConfig?>(null)
    var calls = 0
        private set

    override val current: StateFlow<AppConfig?> = state

    override suspend fun refresh(): AppResult<AppConfig> {
        calls += 1
        val answer = if (answers.size > 1) answers.removeAt(0) else answers.first()
        if (answer is AppResult.Success) state.value = answer.data
        return answer
    }
}
