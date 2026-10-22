package com.fab.wab.merchant.core.notification.composable

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.notification.manager.LocalNotificationManager
import com.fab.wab.merchant.core.notification.manager.NotificationManager
import com.fab.wab.merchant.core.notification.state.NotificationViewModel
import org.koin.compose.viewmodel.koinViewModel

@Composable
fun NotificationHost(
    content: @Composable () -> Unit,
) {
    val viewModel: NotificationViewModel = koinViewModel()
    val uiState by viewModel.uiState.collectAsState()

    val notificationManager = remember {
        NotificationManager(viewModel::handleEvent)
    }

    CompositionLocalProvider(LocalNotificationManager provides notificationManager) {
        Box(modifier = Modifier.fillMaxSize()) {
            content()

            if (uiState.notifications.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .align(Alignment.TopCenter)
                        .windowInsetsPadding(WindowInsets.statusBars),
                ) {
                    NotificationDisplay(
                        bodyTextStyle = MaterialTheme.typography.bodyMedium,
                        viewModel = viewModel,
                    )
                }
            }
        }
    }
}

@Composable
fun rememberNotificationManager(): NotificationManager {
    return LocalNotificationManager.current
}
