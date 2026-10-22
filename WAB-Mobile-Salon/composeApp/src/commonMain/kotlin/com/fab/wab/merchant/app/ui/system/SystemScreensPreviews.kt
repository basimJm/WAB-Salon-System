package com.fab.wab.merchant.app.ui.system

import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.designsystem.theme.AppWindowSize

private const val PHONE_WIDTH = 390
private const val PHONE_HEIGHT = 844
private const val TABLET_WIDTH = 1024
private const val TABLET_HEIGHT = 768
private const val SERVER_MESSAGE_AR = "نقوم بتحديث الأنظمة، سنعود خلال ساعة."

@Composable
private fun SystemPreviewFrame(dark: Boolean, rtl: Boolean, width: Int, height: Int, content: @Composable () -> Unit) {
    val direction = if (rtl) LayoutDirection.Rtl else LayoutDirection.Ltr
    CompositionLocalProvider(LocalLayoutDirection provides direction) {
        AppTheme(darkTheme = dark, windowSize = AppWindowSize(width.dp, height.dp)) { content() }
    }
}

@Preview(widthDp = PHONE_WIDTH, heightDp = PHONE_HEIGHT)
@Composable
private fun ForceUpdateArabicLightPreview() =
    SystemPreviewFrame(dark = false, rtl = true, PHONE_WIDTH, PHONE_HEIGHT) { ForceUpdateScreen(onUpdate = {}) }

@Preview(widthDp = PHONE_WIDTH, heightDp = PHONE_HEIGHT)
@Composable
private fun ForceUpdateEnglishDarkPreview() =
    SystemPreviewFrame(dark = true, rtl = false, PHONE_WIDTH, PHONE_HEIGHT) { ForceUpdateScreen(onUpdate = {}) }

@Preview(widthDp = PHONE_WIDTH, heightDp = PHONE_HEIGHT)
@Composable
private fun MaintenanceArabicServerMessagePreview() =
    SystemPreviewFrame(dark = false, rtl = true, PHONE_WIDTH, PHONE_HEIGHT) {
        MaintenanceScreen(message = SERVER_MESSAGE_AR, onRetry = {})
    }

@Preview(widthDp = PHONE_HEIGHT, heightDp = PHONE_WIDTH)
@Composable
private fun MaintenanceEnglishLandscapePreview() =
    SystemPreviewFrame(dark = false, rtl = false, PHONE_HEIGHT, PHONE_WIDTH) { MaintenanceScreen(message = null, onRetry = {}) }

@Preview(widthDp = TABLET_WIDTH, heightDp = TABLET_HEIGHT)
@Composable
private fun ForceUpdateTabletDarkRtlPreview() =
    SystemPreviewFrame(dark = true, rtl = true, TABLET_WIDTH, TABLET_HEIGHT) { ForceUpdateScreen(onUpdate = {}) }
