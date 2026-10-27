package com.fab.wab.merchant.feature.application.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.upload.AppDocumentUploader
import com.fab.wab.merchant.designsystem.components.upload.AppMediaPicker
import com.fab.wab.merchant.designsystem.components.upload.uploadRejectionText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.application.domain.model.RegistrationField
import com.fab.wab.merchant.feature.application.presentation.analytics.ApplicationAnalytics
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiAction
import com.fab.wab.merchant.feature.application.presentation.controller.contract.RegistrationContract.UiState
import com.fab.wab.merchant.feature.application.presentation.resources.Res
import com.fab.wab.merchant.feature.application.presentation.resources.reg_documents
import com.fab.wab.merchant.feature.application.presentation.resources.reg_documents_error
import com.fab.wab.merchant.feature.application.presentation.resources.reg_documents_hint
import com.fab.wab.merchant.feature.application.presentation.resources.reg_resubmit
import com.fab.wab.merchant.feature.application.presentation.resources.reg_resubmit_title
import com.fab.wab.merchant.feature.application.presentation.resources.reg_size_mb
import com.fab.wab.merchant.feature.application.presentation.resources.reg_submit
import com.fab.wab.merchant.feature.application.presentation.resources.reg_subtitle
import com.fab.wab.merchant.feature.application.presentation.resources.reg_title
import org.jetbrains.compose.resources.stringResource

/** PRD M04 (design 01 `on.register`): salon, type, owner, city/area, license documents, terms, submit. */
@Composable
fun RegistrationScreen(
    state: UiState,
    onAction: (UiAction) -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    TrackScreen(ApplicationAnalytics.SCREEN_REGISTRATION)
    val spacing = AppTheme.spacing
    val title = stringResource(if (state.isResubmission) Res.string.reg_resubmit_title else Res.string.reg_title)
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = title, onBack = onBack) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = spacing.space20, vertical = spacing.space16),
            verticalArrangement = Arrangement.spacedBy(spacing.space16),
        ) {
            if (!state.isResubmission) {
                AppText(
                    text = stringResource(Res.string.reg_subtitle),
                    style = AppTheme.typography.bodyMedium,
                    color = AppTheme.colors.muted,
                )
            }
            AppCard { SalonFields(state, onAction) }
            if (!state.isResubmission) AppCard { OwnerFields(state, onAction) }
            DocumentsSection(state, onAction)
            if (!state.isResubmission) TermsRow(state, onAction)
            AppButton(
                text = stringResource(if (state.isResubmission) Res.string.reg_resubmit else Res.string.reg_submit),
                onClick = { onAction(UiAction.OnSubmit) },
                loading = state.submitting,
                enabled = !state.submitting,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
    AppMediaPicker(state.media) { onAction(UiAction.OnMedia(it)) }
}

@Composable
private fun DocumentsSection(state: UiState, onAction: (UiAction) -> Unit) {
    val unit = stringResource(Res.string.reg_size_mb, SIZE_PLACEHOLDER)
    val rejection = state.documentRejection
    val error = when {
        rejection != null -> uploadRejectionText(rejection)
        state.errorOf(RegistrationField.DOCUMENTS) -> stringResource(Res.string.reg_documents_error)
        else -> null
    }
    AppDocumentUploader(
        label = stringResource(Res.string.reg_documents),
        hint = stringResource(Res.string.reg_documents_hint),
        items = state.documents.map { it.toUi(unit) },
        onAdd = { onAction(UiAction.OnAddDocuments) },
        onRemove = { onAction(UiAction.OnRemoveDocument(it)) },
        onRetry = { onAction(UiAction.OnRetryDocument(it)) },
        error = error,
    )
}

@Composable
internal fun FieldRow(content: @Composable () -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space10), verticalAlignment = Alignment.Top) { content() }
}
