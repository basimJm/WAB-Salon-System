package com.fab.wab.customer.feature.profile.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.profile.presentation.resources.Res
import com.fab.wab.customer.feature.profile.presentation.resources.profile_cancel
import com.fab.wab.customer.feature.profile.presentation.resources.profile_dialog_mark
import org.jetbrains.compose.resources.stringResource

/**
 * Logout / delete confirmation of the design: 24 px card, "!" in a pink 56 px circle, bold title, muted body,
 * filled pink confirm (50 px) and a plain Cancel (46 px).
 */
@Composable
internal fun ProfileDangerDialog(
    title: String,
    body: String,
    confirmText: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = AppTheme.colors
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(
            modifier = modifier
                .padding(ProfileDesign.dialogOuterPadding)
                .widthIn(max = AppTheme.sizes.dialogMaxWidth)
                .fillMaxWidth()
                .background(colors.card, RoundedCornerShape(ProfileDesign.dialogRadius))
                .padding(
                    start = ProfileDesign.dialogHorizontal,
                    top = ProfileDesign.dialogTop,
                    end = ProfileDesign.dialogHorizontal,
                    bottom = ProfileDesign.dialogBottomPadding,
                ),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(
                modifier = Modifier
                    .padding(bottom = ProfileDesign.dialogIconBottom)
                    .size(ProfileDesign.dialogIcon)
                    .background(colors.danger.copy(alpha = ProfileDesign.dialogIconAlpha), AppTheme.shapes.circle),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = stringResource(Res.string.profile_dialog_mark),
                    style = AppTheme.typography.titleLarge.copy(fontSize = ProfileDesign.dialogIconTextSize, fontWeight = FontWeight.Bold),
                    color = colors.danger,
                )
            }
            AppText(
                text = title,
                style = AppTheme.typography.titleLarge.copy(fontSize = ProfileDesign.dialogTitleSize, fontWeight = FontWeight.Bold),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = ProfileDesign.dialogTitleBottom),
            )
            AppText(
                text = body,
                style = AppTheme.typography.bodyMedium.copy(
                    fontSize = ProfileDesign.dialogBodySize,
                    lineHeight = ProfileDesign.dialogBodyLineHeight,
                ),
                color = colors.muted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(bottom = ProfileDesign.dialogBodyBottom),
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(ProfileDesign.dialogOkHeight)
                    .clip(AppTheme.shapes.medium)
                    .background(colors.danger)
                    .clickable(role = Role.Button, onClick = onConfirm),
                contentAlignment = Alignment.Center,
            ) {
                AppText(
                    text = confirmText,
                    style = AppTheme.typography.labelLarge.copy(
                        fontSize = ProfileDesign.dialogOkTextSize,
                        fontWeight = FontWeight.SemiBold,
                    ),
                    color = colors.onGradient,
                    maxLines = 1,
                )
            }
            PlainTextButton(
                text = stringResource(Res.string.profile_cancel),
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth().padding(top = ProfileDesign.dialogButtonGap),
                height = ProfileDesign.dialogCancelHeight,
                textSize = ProfileDesign.dialogCancelTextSize,
                color = colors.muted,
            )
        }
    }
}
