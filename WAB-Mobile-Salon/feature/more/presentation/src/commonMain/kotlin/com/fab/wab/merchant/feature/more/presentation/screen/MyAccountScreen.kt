package com.fab.wab.merchant.feature.more.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.core.domain.session.MemberRole
import com.fab.wab.merchant.designsystem.components.badge.AppStatusBadge
import com.fab.wab.merchant.designsystem.components.badge.StatusTone
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.AppImageUploader
import com.fab.wab.merchant.designsystem.components.upload.CropAspect
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.more.domain.AccountField
import com.fab.wab.merchant.feature.more.presentation.analytics.MoreAnalytics
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.UiAction
import com.fab.wab.merchant.feature.more.presentation.controller.contract.MyAccountContract.UiState
import com.fab.wab.merchant.feature.more.presentation.resources.Res
import com.fab.wab.merchant.feature.more.presentation.resources.account_change_phone
import com.fab.wab.merchant.feature.more.presentation.resources.account_first
import com.fab.wab.merchant.feature.more.presentation.resources.account_last
import com.fab.wab.merchant.feature.more.presentation.resources.account_phone
import com.fab.wab.merchant.feature.more.presentation.resources.account_photo
import com.fab.wab.merchant.feature.more.presentation.resources.account_remove_photo
import com.fab.wab.merchant.feature.more.presentation.resources.account_required
import com.fab.wab.merchant.feature.more.presentation.resources.account_role
import com.fab.wab.merchant.feature.more.presentation.resources.account_save
import com.fab.wab.merchant.feature.more.presentation.resources.account_title
import com.fab.wab.merchant.feature.more.presentation.resources.more_employee
import com.fab.wab.merchant.feature.more.presentation.resources.more_manager
import com.fab.wab.merchant.feature.more.presentation.resources.more_owner
import org.jetbrains.compose.resources.stringResource

/** PRD M25 My account: photo, first / last name, phone with "Change phone" (OTP to the new number), role. */
@Composable
fun MyAccountScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(MoreAnalytics.SCREEN_ACCOUNT)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = stringResource(Res.string.account_title), onBack = onBack) },
        bottomBar = {
            if (state.account != null) {
                AppButton(
                    text = stringResource(Res.string.account_save),
                    onClick = { onAction(UiAction.OnSave) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    enabled = state.canSave,
                    loading = state.saving,
                )
            }
        },
    ) { padding ->
        when {
            state.account != null -> Form(state, onAction, Modifier.padding(padding))
            state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
        }
    }
    AccountOverlays(state, onAction)
}

@Composable
private fun Form(state: UiState, onAction: (UiAction) -> Unit, modifier: Modifier = Modifier) {
    val spacing = AppTheme.spacing
    val errors = state.visibleErrors
    val account = state.account ?: return
    Column(
        modifier = modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(spacing.space16),
        verticalArrangement = Arrangement.spacedBy(spacing.space14),
    ) {
        AppText(text = stringResource(Res.string.account_photo), style = AppTheme.typography.labelLarge)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space12)) {
            AppImageUploader(
                item = state.photo,
                aspect = CropAspect.SQUARE,
                onPick = { onAction(UiAction.OnPickPhoto) },
                onRetry = { onAction(UiAction.OnPickPhoto) },
                modifier = Modifier.width(AppTheme.sizes.avatarLarge),
            )
            if (state.photo != null && !state.uploading) {
                AppButton(stringResource(Res.string.account_remove_photo), { onAction(UiAction.OnRemovePhoto) }, kind = ButtonKind.Text)
            }
        }
        val required = stringResource(Res.string.account_required)
        AppTextField(
            value = state.firstName,
            onValueChange = { onAction(UiAction.OnFirstName(it)) },
            label = stringResource(Res.string.account_first),
            error = if (AccountField.FIRST_NAME in errors) required else null,
        )
        AppTextField(
            value = state.lastName,
            onValueChange = { onAction(UiAction.OnLastName(it)) },
            label = stringResource(Res.string.account_last),
            error = if (AccountField.LAST_NAME in errors) required else null,
        )
        AppTextField(
            value = account.phone,
            onValueChange = {},
            label = stringResource(Res.string.account_phone),
            readOnly = true,
            enabled = false,
            textDirection = TextDirection.Ltr,
        )
        AppButton(
            stringResource(Res.string.account_change_phone),
            { onAction(UiAction.OnChangePhone) },
            Modifier.fillMaxWidth(),
            kind = ButtonKind.Outlined,
            loading = state.changingPhone,
            leadingIcon = AppIcons.Call,
        )
        roleLabel(account.role)?.let { role ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(spacing.space8)) {
                AppText(
                    text = stringResource(Res.string.account_role),
                    style = AppTheme.typography.labelLarge,
                    color = AppTheme.colors.muted,
                )
                AppStatusBadge(text = role, tone = StatusTone.Accent)
            }
        }
    }
}

@Composable
private fun roleLabel(role: MemberRole?): String? = when (role) {
    MemberRole.OWNER -> stringResource(Res.string.more_owner)
    MemberRole.MANAGER -> stringResource(Res.string.more_manager)
    MemberRole.EMPLOYEE -> stringResource(Res.string.more_employee)
    null -> null
}
