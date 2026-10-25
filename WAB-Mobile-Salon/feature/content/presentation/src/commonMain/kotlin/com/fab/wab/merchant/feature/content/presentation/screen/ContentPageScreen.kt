package com.fab.wab.merchant.feature.content.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.config.ContactInfo
import com.fab.wab.merchant.designsystem.components.button.AppOutlinedButton
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.feedback.AppStateContent
import com.fab.wab.merchant.designsystem.components.feedback.contentStateOf
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.content.domain.model.ContentSlugs
import com.fab.wab.merchant.feature.content.presentation.analytics.ContentAnalytics
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContactChannel
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContentPageContract.UiAction
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContentPageContract.UiState
import com.fab.wab.merchant.feature.content.presentation.resources.Res
import com.fab.wab.merchant.feature.content.presentation.resources.content_contact_call
import com.fab.wab.merchant.feature.content.presentation.resources.content_contact_email
import com.fab.wab.merchant.feature.content.presentation.resources.content_contact_intro
import com.fab.wab.merchant.feature.content.presentation.resources.content_contact_missing
import com.fab.wab.merchant.feature.content.presentation.resources.content_contact_whatsapp
import com.fab.wab.merchant.feature.content.presentation.resources.content_empty
import com.fab.wab.merchant.feature.content.presentation.resources.content_title_about
import com.fab.wab.merchant.feature.content.presentation.resources.content_title_contact
import com.fab.wab.merchant.feature.content.presentation.resources.content_title_page
import com.fab.wab.merchant.feature.content.presentation.resources.content_title_privacy
import com.fab.wab.merchant.feature.content.presentation.resources.content_title_terms
import org.jetbrains.compose.resources.stringResource

/** S23 page template: server rich text (privacy / terms / about) or the contact channels. */
@Composable
fun ContentPageScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(ContentAnalytics.PAGE_SCREEN)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = titleOf(state.slug), onBack = onBack) }) { padding ->
        AppStateContent(
            state = contentStateOf(
                isLoading = state.loading,
                isOffline = state.offline,
                errorMessage = state.error,
                isEmpty = !state.loading && state.error == null && !state.isContact && state.blocks.isEmpty(),
                hasContent = state.isContact || state.blocks.isNotEmpty(),
            ),
            onRetry = { onAction(UiAction.OnRetry) },
            modifier = Modifier.fillMaxSize().padding(padding),
            empty = { AppEmptyState(title = stringResource(Res.string.content_empty)) },
        ) {
            Column(
                modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                val width = Modifier.fillMaxWidth().widthIn(max = AppTheme.sizes.sheetMaxWidth)
                if (state.isContact) {
                    ContactChannels(state.contact, onAction, width)
                } else {
                    RichTextBlocks(state.blocks, onLinkClick = { onAction(UiAction.OnLinkClick(it)) }, modifier = width)
                }
            }
        }
    }
}

@Composable
private fun ContactChannels(contact: ContactInfo?, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(spacing.space12)) {
        if (contact == null) {
            AppText(text = stringResource(Res.string.content_contact_missing), color = AppTheme.colors.muted)
            return
        }
        AppText(text = stringResource(Res.string.content_contact_intro), color = AppTheme.colors.muted)
        AppOutlinedButton(
            text = stringResource(Res.string.content_contact_call),
            onClick = { onAction(UiAction.OnContactChannel(ContactChannel.CALL)) },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = AppIcons.Call,
        )
        AppOutlinedButton(
            text = stringResource(Res.string.content_contact_whatsapp),
            onClick = { onAction(UiAction.OnContactChannel(ContactChannel.WHATSAPP)) },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = AppIcons.Chat,
        )
        AppOutlinedButton(
            text = stringResource(Res.string.content_contact_email),
            onClick = { onAction(UiAction.OnContactChannel(ContactChannel.EMAIL)) },
            modifier = Modifier.fillMaxWidth(),
            leadingIcon = AppIcons.Email,
        )
    }
}

@Composable
private fun titleOf(slug: String): String = when (slug) {
    ContentSlugs.PRIVACY -> stringResource(Res.string.content_title_privacy)
    ContentSlugs.TERMS -> stringResource(Res.string.content_title_terms)
    ContentSlugs.ABOUT -> stringResource(Res.string.content_title_about)
    ContentSlugs.CONTACT -> stringResource(Res.string.content_title_contact)
    else -> stringResource(Res.string.content_title_page)
}
