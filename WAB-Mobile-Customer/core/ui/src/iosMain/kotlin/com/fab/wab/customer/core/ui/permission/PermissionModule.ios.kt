package com.fab.wab.customer.core.ui.permission

import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformPermissionModule: Module = module {
    single<PermissionManager> { IosPermissionManager() }
}
