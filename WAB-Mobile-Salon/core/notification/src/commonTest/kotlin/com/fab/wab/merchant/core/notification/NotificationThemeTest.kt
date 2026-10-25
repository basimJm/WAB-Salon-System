package com.fab.wab.merchant.core.notification

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import com.fab.wab.merchant.core.notification.model.NotificationColors
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.notification.model.NotificationTheme
import kotlin.test.Test
import kotlin.test.assertEquals

class NotificationThemeTest {
    private val info = NotificationColors(Color.Blue, Color.White)
    private val success = NotificationColors(Color.Green, Color.Black)
    private val warning = NotificationColors(Color.Yellow, Color.Black)
    private val error = NotificationColors(Color.Red, Color.White)
    private val icon = ImageVector.Builder("close", 24.dp, 24.dp, 24f, 24f).build()
    private val theme = NotificationTheme(info, success, warning, error, icon, "Close")

    @Test
    fun everyStyleGetsItsOwnColors() {
        assertEquals(info, theme.colorsOf(NotificationStyle.Info))
        assertEquals(success, theme.colorsOf(NotificationStyle.Success))
        assertEquals(warning, theme.colorsOf(NotificationStyle.Warning))
        assertEquals(error, theme.colorsOf(NotificationStyle.Error))
    }
}
