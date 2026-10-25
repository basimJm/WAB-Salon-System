package com.fab.wab.merchant.core.notification.composable

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.EaseInOut
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fab.wab.merchant.core.notification.model.NotificationConstants
import com.fab.wab.merchant.core.notification.model.NotificationContent
import com.fab.wab.merchant.core.notification.model.NotificationTheme
import com.fab.wab.merchant.core.notification.state.NotificationEvent
import com.fab.wab.merchant.core.notification.state.NotificationHidden
import com.fab.wab.merchant.core.notification.state.NotificationItemState
import com.fab.wab.merchant.core.notification.state.NotificationRemoved
import com.fab.wab.merchant.core.notification.state.NotificationShown
import com.fab.wab.merchant.core.notification.state.NotificationViewModel
import kotlinx.coroutines.delay

private const val MESSAGE_MAX_LINES = 3
private const val TITLED_MESSAGE_MAX_LINES = 2

@Composable
internal fun NotificationDisplay(
    viewModel: NotificationViewModel,
    bodyTextStyle: TextStyle,
    theme: NotificationTheme,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier
            .fillMaxWidth()
            .wrapContentHeight()
            .animateContentSize(),
        userScrollEnabled = false,
    ) {
        items(
            items = uiState.getOrderedNotifications(),
            key = { it.id },
        ) { notificationState ->
            NotificationItemWrapper(
                notificationState = notificationState,
                defaultBodyTextStyle = bodyTextStyle,
                theme = theme,
                onEvent = viewModel::handleEvent,
            )
        }
    }
}

@Composable
private fun NotificationItemWrapper(
    notificationState: NotificationItemState,
    defaultBodyTextStyle: TextStyle,
    theme: NotificationTheme,
    onEvent: (NotificationEvent) -> Unit,
) {
    val currentOnEvent by rememberUpdatedState(onEvent)
    LaunchedEffect(Unit) {
        currentOnEvent(NotificationShown(notificationState.id))
    }

    LaunchedEffect(notificationState.isVisible) {
        if (notificationState.isVisible) {
            delay(notificationState.autoDismissDelayMs)
            currentOnEvent(NotificationHidden(notificationState.id))
        }
    }

    AnimatedVisibility(
        visible = notificationState.isVisible,
        enter = slideInVertically(
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioNoBouncy,
                stiffness = Spring.StiffnessLow,
            ),
        ) { -it },
        exit = scaleOut(animationSpec = tween(easing = EaseInOut))
                + fadeOut(animationSpec = tween(easing = EaseInOut)),
    ) {
        NotificationCard(
            notificationState = notificationState,
            defaultBodyTextStyle = defaultBodyTextStyle,
            theme = theme,
            onEvent = onEvent,
            onDismiss = { onEvent(NotificationHidden(notificationState.id)) },
            modifier = Modifier.padding(horizontal = NotificationConstants.GAP, vertical = NotificationConstants.GAP_SMALL),
        )
    }
}

@Composable
private fun NotificationCard(
    notificationState: NotificationItemState,
    defaultBodyTextStyle: TextStyle,
    theme: NotificationTheme,
    onEvent: (NotificationEvent) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val currentOnEvent by rememberUpdatedState(onEvent)
    DisposableEffect(Unit) {
        onDispose { currentOnEvent(NotificationRemoved(notificationState.id)) }
    }

    val backgroundColor = notificationState.customBackgroundColor
        ?: theme.colorsOf(notificationState.style).background
    val contentColor = notificationState.customContentColor
        ?: theme.colorsOf(notificationState.style).content
    val cardShape = if (notificationState.customCornerRadius != null) {
        RoundedCornerShape(notificationState.customCornerRadius)
    } else {
        notificationState.style.shape
    }

    Box(
        modifier = modifier.fillMaxWidth(),
        contentAlignment = Alignment.Center,
    ) {
        Box(
            modifier = Modifier
                .widthIn(max = NotificationConstants.MAX_WIDTH)
                .background(color = backgroundColor, shape = cardShape),
            contentAlignment = Alignment.Center,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(NotificationConstants.PADDING),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                NotificationContentDisplay(
                    modifier = Modifier
                        .weight(1f)
                        .padding(
                            start = NotificationConstants.GAP,
                            end = if (notificationState.showDismissButton) {
                                NotificationConstants.DISMISS_SPACE
                            } else {
                                NotificationConstants.GAP
                            },
                        ),
                    content = notificationState.content,
                    bodyTextStyle = notificationState.bodyTextStyle ?: defaultBodyTextStyle,
                    titleTextStyle = notificationState.titleTextStyle
                        ?: defaultBodyTextStyle.copy(fontWeight = FontWeight.SemiBold),
                    contentColor = contentColor,
                )

                if (notificationState.showDismissButton) {
                    IconButton(onClick = onDismiss) {
                        Icon(theme.closeIcon, contentDescription = theme.closeLabel, tint = contentColor)
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationContentDisplay(
    content: NotificationContent,
    bodyTextStyle: TextStyle,
    titleTextStyle: TextStyle,
    contentColor: Color,
    modifier: Modifier = Modifier,
) {
    when (content) {
        is NotificationContent.Message -> {
            Text(
                modifier = modifier,
                text = content.text.trim(),
                style = bodyTextStyle.copy(color = contentColor),
                maxLines = MESSAGE_MAX_LINES,
            )
        }
        is NotificationContent.TitleAndMessage -> {
            Column(modifier = modifier) {
                Text(
                    text = content.title,
                    style = titleTextStyle.copy(color = contentColor),
                    maxLines = 1,
                )
                Text(
                    modifier = Modifier.padding(top = NotificationConstants.GAP_SMALL),
                    text = content.message,
                    style = bodyTextStyle.copy(color = contentColor),
                    maxLines = TITLED_MESSAGE_MAX_LINES,
                )
            }
        }
        is NotificationContent.CustomComposable -> {
            content.Display(modifier)
        }
    }
}
