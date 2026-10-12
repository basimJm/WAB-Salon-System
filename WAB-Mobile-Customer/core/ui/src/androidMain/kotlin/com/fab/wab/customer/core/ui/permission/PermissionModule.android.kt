package com.fab.wab.customer.core.ui.permission

import android.content.Context
import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformPermissionModule: Module = module {
    single { AndroidPermissionBridge() }
    single<PermissionManager> { AndroidPermissionManager(get<Context>(), get()) }
}
