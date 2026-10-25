package com.fab.wab.merchant.core.notification.manager

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidedValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalInspectionMode
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import com.fab.wab.merchant.core.notification.model.NotificationConfiguration
import com.fab.wab.merchant.core.notification.model.NotificationContent
import com.fab.wab.merchant.core.notification.model.NotificationDefaults
import com.fab.wab.merchant.core.notification.model.NotificationStyle
import com.fab.wab.merchant.core.notification.state.NotificationEvent
import com.fab.wab.merchant.core.notification.state.ShowNotification
import kotlin.random.Random
import org.jetbrains.compose.resources.StringResource

class NotificationManager internal constructor(
    private val handleEvent: (NotificationEvent) -> Unit,
) {
    fun show(
        message: String,
        style: NotificationStyle = NotificationStyle.Info,
        title: String? = null
    ) {
        title?.let {
            show(NotificationContent.TitleAndMessage(title, message), style)
        } ?: run {
            show(NotificationContent.Message(message), style)
        }
    }

    fun showCustom(content: StringResource, style: NotificationStyle = NotificationStyle.Info) {
        show(NotificationContent.CustomComposable(content), style)
    }

    fun show(config: NotificationConfiguration) {
        handleEvent(
            ShowNotification(
                id = generateNotificationId(),
                content = config.content,
                style = config.style,
                bodyTextStyle = config.bodyTextStyle,
                titleTextStyle = config.titleTextStyle,
                customContentColor = config.customContentColor,
                customBackgroundColor = config.customBackgroundColor,
                customCornerRadius = config.customCornerRadius,
                showDismissButton = config.showDismissButton,
                autoDismissDelayMs = config.autoDismissDelayMs,
            ),
        )
    }

    fun show(
        content: NotificationContent,
        style: NotificationStyle,
        bodyTextStyle: TextStyle? = null,
        titleTextStyle: TextStyle? = null,
        customContentColor: Color? = null,
        customBackgroundColor: Color? = null,
        customCornerRadius: Dp? = null,
        showDismissButton: Boolean = true,
        autoDismissDelayMs: Long = NotificationDefaults.AUTO_DISMISS_MS,
    ) {
        handleEvent(
            ShowNotification(
                id = generateNotificationId(),
                content = content,
                style = style,
                bodyTextStyle = bodyTextStyle,
                titleTextStyle = titleTextStyle,
                customContentColor = customContentColor,
                customBackgroundColor = customBackgroundColor,
                customCornerRadius = customCornerRadius,
                showDismissButton = showDismissButton,
                autoDismissDelayMs = autoDismissDelayMs,
            ),
        )
    }

    private fun generateNotificationId(): String {
        return "${Random.nextLong()}"
    }
}

internal object LocalNotificationManager {
    private val LocalManager = staticCompositionLocalOf<NotificationManager> {
        error("NotificationManager not provided. Wrap your content with NotificationHost.")
    }

    val current: NotificationManager
        @Composable get() = if (LocalInspectionMode.current) {
            NotificationManager { }
        } else {
            LocalManager.current
        }

    infix fun provides(
        notificationManager: NotificationManager,
    ): ProvidedValue<NotificationManager> {
        return LocalManager provides notificationManager
    }
}
