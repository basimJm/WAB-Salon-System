package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.customer.designsystem.components.feedback.AppErrorState
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.image.AppImage
import com.fab.wab.customer.designsystem.components.shimmer.AppShimmerListItem
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.designsystem.theme.GlassStyle
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiAction
import com.fab.wab.customer.feature.profile.presentation.controller.contract.ProfileContract.UiState
import com.fab.wab.customer.feature.profile.presentation.resources.Res
import com.fab.wab.customer.feature.profile.presentation.resources.profile_guest_account
import com.fab.wab.customer.feature.profile.presentation.resources.profile_guest_edit
import com.fab.wab.customer.feature.profile.presentation.resources.profile_guest_welcome
import com.fab.wab.customer.feature.profile.presentation.resources.profile_photo_change
import org.jetbrains.compose.resources.stringResource

/**
 * S21 header card (`gap:14px;padding:16px;border-radius:22px;background:var(--surface)`).
 * Guest: 60 px initial circle, "Hello, nick", "Guest account", Edit. Registered: 68 px avatar + camera badge, name, email.
 */
@Composable
internal fun ProfileHeader(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .glassBackground(AppTheme.glass, AppTheme.shapes.extraLarge, GlassStyle.Prominent)
            .padding(AppTheme.spacing.space16),
        horizontalArrangement = Arrangement.spacedBy(ProfileDesign.headerGap),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        when {
            !state.signedIn -> GuestHeader(state, onAction)
            state.account == null && state.accountError != null ->
                AppErrorState(onRetry = { onAction(UiAction.OnRetryAccount) }, message = state.accountError)
            state.account == null -> AppShimmerListItem(circularImage = true)
            else -> RegisteredHeader(state, onAction)
        }
    }
}

@Composable
private fun GuestInitial(initial: String) {
    Box(
        modifier = Modifier.size(ProfileDesign.guestAvatar).background(AppTheme.colors.soft, AppTheme.shapes.circle),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = initial,
            style = AppTheme.typography.titleLarge.copy(fontSize = ProfileDesign.guestInitialSize, fontWeight = FontWeight.Bold),
            color = AppTheme.colors.accent,
            maxLines = 1,
        )
    }
}

@Composable
private fun RowScope.GuestHeader(state: UiState, onAction: (UiAction) -> Unit) {
    val colors = AppTheme.colors
    GuestInitial(state.guestNickname.trim().take(1))
    Column(modifier = Modifier.weight(1f)) {
        AppText(
            text = stringResource(Res.string.profile_guest_welcome, state.guestNickname),
            style = AppTheme.typography.titleMedium.copy(fontSize = ProfileDesign.nameSize, fontWeight = FontWeight.Bold),
            maxLines = 1,
        )
        AppText(
            text = stringResource(Res.string.profile_guest_account),
            style = AppTheme.typography.bodySmall.copy(fontSize = ProfileDesign.emailSize),
            color = colors.muted,
            maxLines = 1,
        )
    }
    Box(
        modifier = Modifier
            .height(ProfileDesign.editHeight)
            .glassBackground(AppTheme.glass, RoundedCornerShape(ProfileDesign.editRadius))
            .clickable(role = Role.Button) { onAction(UiAction.OnEditGuestClick) }
            .padding(horizontal = ProfileDesign.editHorizontal),
        contentAlignment = Alignment.Center,
    ) {
        AppText(
            text = stringResource(Res.string.profile_guest_edit),
            style = AppTheme.typography.labelMedium.copy(fontSize = ProfileDesign.editTextSize, fontWeight = FontWeight.SemiBold),
            color = colors.accent,
            maxLines = 1,
        )
    }
}

@Composable
private fun RowScope.RegisteredHeader(state: UiState, onAction: (UiAction) -> Unit) {
    val account = state.account ?: return
    val change = stringResource(Res.string.profile_photo_change)
    Box(
        modifier = Modifier
            .size(ProfileDesign.avatar)
            .clickable(enabled = !state.busy, role = Role.Button, onClickLabel = change) { onAction(UiAction.OnPhotoClick) },
    ) {
        val photo = account.avatarUrl
        if (photo != null) {
            AppImage(url = photo, modifier = Modifier.size(ProfileDesign.avatar).clip(AppTheme.shapes.circle))
        } else {
            PlaceholderAvatar()
        }
        CameraBadge(Modifier.align(Alignment.BottomEnd))
    }
    Column(modifier = Modifier.weight(1f)) {
        AppText(
            text = account.fullName,
            style = AppTheme.typography.titleMedium.copy(fontSize = ProfileDesign.nameSize, fontWeight = FontWeight.Bold),
            maxLines = 1,
        )
        AppText(
            text = account.email,
            style = AppTheme.typography.bodySmall.copy(fontSize = ProfileDesign.emailSize, textDirection = TextDirection.Ltr),
            color = AppTheme.colors.muted,
            maxLines = 1,
        )
    }
}

/** `linear-gradient(135deg,#D8B4FE,#A855F7)` circle with a white person glyph sitting on the bottom edge. */
@Composable
private fun PlaceholderAvatar() {
    val colors = AppTheme.colors
    Box(
        modifier = Modifier
            .size(ProfileDesign.avatar)
            .clip(AppTheme.shapes.circle)
            .background(Brush.linearGradient(listOf(colors.heroEnd, colors.gradientEnd))),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Icon(
            imageVector = AppIcons.Profile,
            contentDescription = null,
            tint = colors.onGradient.copy(alpha = ProfileDesign.avatarIconAlpha),
            modifier = Modifier.size(ProfileDesign.avatarIcon),
        )
    }
}

@Composable
private fun CameraBadge(modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Box(
        modifier = modifier
            .size(ProfileDesign.cameraBadge)
            .background(colors.gradientStart, AppTheme.shapes.circle)
            .border(ProfileDesign.cameraBadgeBorder, colors.surface, AppTheme.shapes.circle),
        contentAlignment = Alignment.Center,
    ) {
        Icon(AppIcons.Camera, contentDescription = null, tint = colors.onGradient, modifier = Modifier.size(ProfileDesign.cameraIcon))
    }
}
