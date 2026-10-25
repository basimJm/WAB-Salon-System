package com.fab.wab.merchant.app.request

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.merchant.core.domain.AppLanguage
import com.fab.wab.merchant.core.domain.AppearanceSettings
import com.fab.wab.merchant.core.domain.ThemeMode
import com.fab.wab.merchant.core.ui.utils.LocalAppLocale
import com.fab.wab.merchant.core.ui.utils.LocalDarkTheme
import com.fab.wab.merchant.designsystem.components.image.LocalImageLoader
import com.fab.wab.merchant.designsystem.components.image.rememberImageLoader
import com.fab.wab.merchant.designsystem.theme.AppTheme

/** The app's language (RTL / LTR), light / dark choice and theme for content drawn outside the activity. */
@Composable
internal fun OverlayTheme(appearance: AppearanceSettings, content: @Composable () -> Unit) {
    val language by appearance.language.collectAsStateWithLifecycle(AppLanguage.DEFAULT)
    val themeMode by appearance.themeMode.collectAsStateWithLifecycle(ThemeMode.SYSTEM)
    val systemDark = isSystemInDarkTheme()
    val dark = when (themeMode) {
        ThemeMode.DARK -> true
        ThemeMode.LIGHT -> false
        ThemeMode.SYSTEM -> systemDark
    }
    CompositionLocalProvider(LocalLayoutDirection provides if (language.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr) {
        CompositionLocalProvider(
            LocalAppLocale provides language.code,
            LocalDarkTheme provides dark,
            LocalImageLoader provides rememberImageLoader(),
        ) {
            AppTheme { content() }
        }
    }
}
