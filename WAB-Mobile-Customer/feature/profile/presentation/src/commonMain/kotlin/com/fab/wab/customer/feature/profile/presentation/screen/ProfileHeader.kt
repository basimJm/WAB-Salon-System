package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.designsystem.components.avatar.AppAvatar
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.components.card.AppCard
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerListItem
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiState
import com.fab.wab.customer.feature.profile.presentation.resources.Res
import com.fab.wab.customer.feature.profile.presentation.resources.profile_guest_edit
import com.fab.wab.customer.feature.profile.presentation.resources.profile_guest_welcome
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_change
import org.jetbrains.compose.resources.stringResource

/** Guest: welcome + Edit. Registered: tappable avatar (photo options), full name, email; shimmer / error while loading. */
@Composable
internal fun ProfileHeader(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    AppCard(modifier = Modifier.fillMaxWidth()) {
        when {
            !state.signedIn -> Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                AppAvatar(name = state.guestNickname)
                AppText(
                    text = stringResource(Res.string.profile_guest_welcome, state.guestNickname),
                    style = AppTheme.typography.titleMedium,
                    modifier = Modifier.weight(1f),
                )
                AppTextButton(text = stringResource(Res.string.profile_guest_edit), onClick = { onAction(UiAction.OnEditGuestClick) })
            }
            state.account == null && state.accountError != null ->
                AppErrorState(onRetry = { onAction(UiAction.OnRetryAccount) }, message = state.accountError)
            state.account == null -> AppShimmerListItem()
            else -> Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(spacing.space12),
            ) {
                val change = stringResource(Res.string.profile_photo_change)
                AppAvatar(
                    name = state.account.fullName,
                    imageUrl = state.account.avatarUrl,
                    size = AppTheme.sizes.avatarLarge,
                    modifier = Modifier.clickable(enabled = !state.busy, onClickLabel = change) { onAction(UiAction.OnPhotoClick) },
                )
                Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space4)) {
                    AppText(text = state.account.fullName, style = AppTheme.typography.titleMedium)
                    AppText(text = state.account.email, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
                }
            }
        }
    }
}
