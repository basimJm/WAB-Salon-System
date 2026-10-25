package com.fab.wab.merchant.feature.team.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import com.fab.wab.merchant.core.analytics.compose.TrackScreen
import com.fab.wab.merchant.designsystem.components.button.AppButton
import com.fab.wab.merchant.designsystem.components.card.AppCard
import com.fab.wab.merchant.designsystem.components.control.AppCheckbox
import com.fab.wab.merchant.designsystem.components.control.AppSwitch
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.team.domain.StaffField
import com.fab.wab.merchant.feature.team.presentation.analytics.TeamAnalytics
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiAction
import com.fab.wab.merchant.feature.team.presentation.controller.contract.StaffProfileContract.UiState
import com.fab.wab.merchant.feature.team.presentation.resources.Res
import com.fab.wab.merchant.feature.team.presentation.resources.staff_bio
import com.fab.wab.merchant.feature.team.presentation.resources.staff_bio_error
import com.fab.wab.merchant.feature.team.presentation.resources.staff_bride
import com.fab.wab.merchant.feature.team.presentation.resources.staff_bride_sub
import com.fab.wab.merchant.feature.team.presentation.resources.staff_customers
import com.fab.wab.merchant.feature.team.presentation.resources.staff_provides
import com.fab.wab.merchant.feature.team.presentation.resources.staff_provides_sub
import com.fab.wab.merchant.feature.team.presentation.resources.staff_rating
import com.fab.wab.merchant.feature.team.presentation.resources.staff_save
import com.fab.wab.merchant.feature.team.presentation.resources.staff_services
import com.fab.wab.merchant.feature.team.presentation.resources.staff_services_empty
import com.fab.wab.merchant.feature.team.presentation.resources.staff_title
import com.fab.wab.merchant.feature.team.presentation.resources.staff_years
import com.fab.wab.merchant.feature.team.presentation.resources.staff_years_error
import org.jetbrains.compose.resources.stringResource

private const val RATING_SCALE = 10

/** PRD M17 staff profile (design 06 `on.staffForm`). */
@Composable
fun StaffProfileScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(TeamAnalytics.SCREEN_STAFF)
    val spacing = AppTheme.spacing
    AppScreen(
        modifier = modifier,
        topBar = { AppTopBar(title = state.memberName.ifBlank { stringResource(Res.string.staff_title) }, onBack = onBack) },
        bottomBar = {
            if (!state.loading && state.error == null) {
                AppButton(
                    text = stringResource(Res.string.staff_save),
                    onClick = { onAction(UiAction.OnSave) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = spacing.space16, vertical = spacing.space10),
                    enabled = state.canSave,
                    loading = state.saving && state.leaveSheet == null,
                )
            }
        },
    ) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            state.error != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.error)
            else -> Column(
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space14),
            ) {
                Stats(state)
                SwitchRow(
                    stringResource(Res.string.staff_provides),
                    stringResource(Res.string.staff_provides_sub),
                    state.draft.providesServices,
                ) {
                    onAction(UiAction.OnProvides(it))
                }
                AppTextField(
                    value = state.draft.bio,
                    onValueChange = { onAction(UiAction.OnBio(it)) },
                    label = stringResource(Res.string.staff_bio),
                    singleLine = false,
                    error = if (StaffField.BIO in state.visibleErrors) stringResource(Res.string.staff_bio_error) else null,
                )
                AppTextField(
                    value = state.draft.years,
                    onValueChange = { onAction(UiAction.OnYears(it)) },
                    label = stringResource(Res.string.staff_years),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    error = if (StaffField.YEARS in state.visibleErrors) stringResource(Res.string.staff_years_error) else null,
                )
                Services(state, onAction)
                if (state.womenSalon) {
                    SwitchRow(
                        stringResource(Res.string.staff_bride),
                        stringResource(Res.string.staff_bride_sub),
                        state.draft.brideQualified,
                    ) { onAction(UiAction.OnBride(it)) }
                }
                WorkingDays(state, onAction)
                Leaves(state, onAction)
            }
        }
    }
    StaffDialogs(state, onAction)
}

@Composable
private fun Stats(state: UiState) {
    val profile = state.profile ?: return
    val rating = (profile.ratingAverage * RATING_SCALE).toInt()
    val ratingText = "${rating / RATING_SCALE}.${rating % RATING_SCALE}"
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space4)) {
            AppText(
                text = stringResource(Res.string.staff_rating, ratingText, profile.ratingCount),
                style = AppTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
            )
            AppText(
                text = stringResource(Res.string.staff_customers, profile.customersCount),
                style = AppTheme.typography.bodySmall,
                color = AppTheme.colors.muted,
            )
        }
    }
}

@Composable
private fun Services(state: UiState, onAction: (UiAction) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space6)) {
        AppText(text = stringResource(Res.string.staff_services), style = AppTheme.typography.labelLarge)
        if (state.services.isEmpty()) AppText(
            text = stringResource(Res.string.staff_services_empty),
            style = AppTheme.typography.bodySmall,
            color = AppTheme.colors.muted,
        )
        state.services.forEach { service ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                AppCheckbox(checked = service.id in state.draft.serviceIds, onCheckedChange = { onAction(UiAction.OnService(service.id)) })
                AppText(
                    text = service.name,
                    style = AppTheme.typography.bodyMedium,
                    color = if (service.active) AppTheme.colors.ink else AppTheme.colors.faint,
                )
            }
        }
    }
}

@Composable
internal fun SwitchRow(title: String, subtitle: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    AppCard(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                AppText(text = title, style = AppTheme.typography.bodyLarge)
                AppText(text = subtitle, style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
            }
            AppSwitch(checked = checked, onCheckedChange = onChange)
        }
    }
}
