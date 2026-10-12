package com.fab.wab.customer.designsystem.components.screen

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.components.feedback.AppEmptyState
import com.fab.wab.customer.designsystem.components.feedback.AppError
import com.fab.wab.customer.designsystem.components.feedback.AppLoading
import com.fab.wab.customer.designsystem.components.feedback.AppOfflineState
import com.fab.wab.customer.designsystem.components.loading.AppTicketScreenShimmer
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppWindowWidthClass
import com.fab.wab.customer.designsystem.theme.LocalAppColors
import com.fab.wab.customer.designsystem.theme.LocalWindowWidthClass
import com.fab.wab.customer.designsystem.utils.mirror

private const val HORIZONTAL_PADDING_DP = 16

@Composable
fun AppScreen(
    title: String? = null,
    modifier: Modifier = Modifier,
    state: ScreenState<Any> = ScreenState.Content(),
    onBackClick: (() -> Unit)? = null,
    onRetry: (() -> Unit)? = null,
    isRefreshing: Boolean = false,
    onRefresh: (() -> Unit)? = null,
    topBarActions: @Composable RowScope.() -> Unit = {},
    bottomBar: @Composable () -> Unit = {},
    floatingActionButton: @Composable () -> Unit = {},
    isScrollable: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    Scaffold(
        modifier = modifier,
        topBar = {
            if (title != null) {
                AppScreenTopBar(
                    title = title,
                    showBackButton = onBackClick != null,
                    onBackClick = onBackClick,
                    actions = topBarActions,
                )
            }
        },
        bottomBar = bottomBar,
        floatingActionButton = floatingActionButton,
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets.safeDrawing,
    ) { paddingValues ->
        Box(
            modifier = Modifier.padding(paddingValues)
                .fillMaxSize()
        ) {
            when (state) {
                is ScreenState.Loading -> {
                    AppTicketScreenShimmer()
                }

                is ScreenState.Error -> {
                    AppError(
                        title = state.title ?: "Something went wrong",
                        message = state.message ?: "Please try again later.",
                        onRetry = onRetry,
                    )
                }

                is ScreenState.Empty -> {
                    AppEmptyState(
                        title = state.title ?: "No data",
                        message = state.message ?: "There is nothing to display.",
                        icon = state.icon,
                    )
                }

                is ScreenState.Offline -> {
                    AppOfflineState(
                        onRetry = onRetry,
                    )
                }

                is ScreenState.Content -> {
                    val widthClass = LocalWindowWidthClass.current
                    val isExpanded = widthClass == AppWindowWidthClass.Expanded
                    val columnModifier = if (isExpanded) {
                        Modifier
                            .align(Alignment.TopCenter)
                            .widthIn(max = 640.dp)
                            .then(
                                if (isScrollable) Modifier.verticalScroll(rememberScrollState())
                                else Modifier.fillMaxHeight()
                            )
                            .padding(horizontal = HORIZONTAL_PADDING_DP.dp)
                    } else {
                        Modifier
                            .fillMaxSize()
                            .then(
                                if (isScrollable) Modifier.verticalScroll(rememberScrollState())
                                else Modifier
                            )
                            .padding(horizontal = HORIZONTAL_PADDING_DP.dp)
                    }
                    if (onRefresh != null) {
                        AppSwipeRefresh(
                            isRefreshing = isRefreshing,
                            onRefresh = onRefresh,
                            modifier = Modifier.fillMaxSize(),
                        ) {
                            Column(modifier = columnModifier) {
                                content()
                            }
                        }
                    } else {
                        Column(modifier = columnModifier) {
                            content()
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AppScreenTopBar(
    title: String,
    showBackButton: Boolean,
    onBackClick: (() -> Unit)?,
    actions: @Composable RowScope.() -> Unit,
) {
    val colors = LocalAppColors.current
    TopAppBar(
        title = {
            Box(Modifier.fillMaxWidth()) {
                AppText(
                    modifier = Modifier.align(Alignment.Center),
                    text = title,
                    style = MaterialTheme.typography.titleLarge,
                    color = colors.onSurface,
                    textAlign = TextAlign.Center
                )
                if (showBackButton && onBackClick != null) {
                    IconButton(
                        modifier = Modifier.align(Alignment.CenterStart),
                        onClick = onBackClick
                    ) {
                        Icon(
                            imageVector = AppIcons.ArrowBack,
                            contentDescription = "Back",
                            modifier = Modifier.size(24.dp).mirror(),
                        )
                    }
                }
            }
        },
        actions = actions,
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.background,
            scrolledContainerColor = MaterialTheme.colorScheme.background,
            navigationIconContentColor = MaterialTheme.colorScheme.primary,
            titleContentColor = colors.onBackground,
            actionIconContentColor = MaterialTheme.colorScheme.background
        ),
    )
}
