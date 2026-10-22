package com.fab.wab.merchant.core.ui.permission

import com.fab.wab.merchant.core.ui.media.ImagePicker
import com.fab.wab.merchant.core.ui.media.IosImagePicker
import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformPermissionModule: Module = module {
    single<PermissionManager> { IosPermissionManager() }
    single<ImagePicker> { IosImagePicker() }
}
