package com.fab.wab.customer.core.data.mock.di

import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.data.mock.MockFixture
import com.fab.wab.customer.core.data.mock.createMockEngine
import com.fab.wab.customer.core.network.client.HttpEngineProvider
import com.fab.wab.customer.core.network.client.PlatformEngineProvider
import com.fab.wab.customer.core.network.config.ApiConfig
import org.koin.dsl.module

/**
 * Decides the HTTP transport from the environment (`DATA_SOURCE`): the fixtures every feature binds ([MockFixture])
 * when `mock`, the platform engine otherwise. Prod environments refuse `mock` at construction time (`AppEnvironment`).
 */
val mockDataModule = module {
    single<HttpEngineProvider> {
        val environment = get<AppEnvironment>()
        if (environment.usesMock) {
            val fixtures = getAll<MockFixture>()
            val timeout = get<ApiConfig>().sendTimeout
            HttpEngineProvider { createMockEngine(requestTimeoutMs = timeout, fixtures = fixtures) }
        } else {
            PlatformEngineProvider
        }
    }
}
