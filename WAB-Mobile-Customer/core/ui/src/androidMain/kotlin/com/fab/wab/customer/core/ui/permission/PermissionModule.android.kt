package com.fab.wab.customer.core.ui.permission

import android.content.Context
import com.fab.wab.customer.core.ui.media.AndroidImagePicker
import com.fab.wab.customer.core.ui.media.AndroidImagePickerBridge
import com.fab.wab.customer.core.ui.media.ImagePicker
import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformPermissionModule: Module = module {
    single { AndroidPermissionBridge() }
    single<PermissionManager> { AndroidPermissionManager(get<Context>(), get()) }
    single { AndroidImagePickerBridge() }
    single<ImagePicker> { AndroidImagePicker(get<Context>(), get()) }
}
