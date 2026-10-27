package com.fab.wab.merchant.core.ui.permission

import android.content.Context
import com.fab.wab.merchant.core.ui.media.AndroidFilePicker
import com.fab.wab.merchant.core.ui.media.AndroidFilePickerBridge
import com.fab.wab.merchant.core.ui.media.AndroidImageCropper
import com.fab.wab.merchant.core.ui.media.FilePicker
import com.fab.wab.merchant.core.ui.media.ImageCropper
import org.koin.core.module.Module
import org.koin.dsl.module

actual val platformPermissionModule: Module = module {
    single { AndroidPermissionBridge() }
    single<PermissionManager> { AndroidPermissionManager(get<Context>(), get()) }
    single { AndroidFilePickerBridge() }
    single<FilePicker> { AndroidFilePicker(get<Context>(), get()) }
    single<ImageCropper> { AndroidImageCropper() }
    single<OverlayPermission> { AndroidOverlayPermission(get<Context>()) }
}
