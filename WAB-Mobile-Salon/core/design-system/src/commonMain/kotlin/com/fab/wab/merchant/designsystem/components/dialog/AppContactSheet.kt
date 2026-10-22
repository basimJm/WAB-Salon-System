package com.fab.wab.merchant.designsystem.components.dialog

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res
import com.fab.wab.merchant.designsystem.resources.contact_call
import com.fab.wab.merchant.designsystem.resources.contact_email
import com.fab.wab.merchant.designsystem.resources.contact_hours
import com.fab.wab.merchant.designsystem.resources.contact_title
import com.fab.wab.merchant.designsystem.resources.contact_whatsapp
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

/**
 * "Contact WAB" channels (design 08 `sh.contact`): call, WhatsApp, email from the server config. A channel whose
 * callback is null is hidden. [note] adds the reason (e.g. "Get featured").
 */
@Composable
fun AppContactSheet(
    onDismiss: () -> Unit,
    onCall: (() -> Unit)?,
    onWhatsApp: (() -> Unit)?,
    onEmail: (() -> Unit)?,
    note: String? = null,
) {
    val spacing = AppTheme.spacing
    AppBottomSheet(onDismiss = onDismiss) {
        Column(modifier = Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
            AppText(text = stringResource(Res.string.contact_title), style = AppTheme.typography.titleMedium)
            AppText(text = note ?: stringResource(Res.string.contact_hours), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            onCall?.let { AppButton(stringResource(Res.string.contact_call), it, Modifier.fillMaxWidth(), kind = ButtonKind.Secondary, leadingIcon = AppIcons.Call) }
            onWhatsApp?.let { AppButton(stringResource(Res.string.contact_whatsapp), it, Modifier.fillMaxWidth(), kind = ButtonKind.Secondary, leadingIcon = AppIcons.Chat) }
            onEmail?.let { AppButton(stringResource(Res.string.contact_email), it, Modifier.fillMaxWidth(), kind = ButtonKind.Secondary, leadingIcon = AppIcons.Email) }
        }
    }
}
