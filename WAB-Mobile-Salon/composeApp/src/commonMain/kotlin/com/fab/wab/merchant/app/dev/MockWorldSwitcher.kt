package com.fab.wab.merchant.app.dev

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.merchant.app.resources.Res
import com.fab.wab.merchant.app.resources.mock_business
import com.fab.wab.merchant.app.resources.mock_chip
import com.fab.wab.merchant.app.resources.mock_employee
import com.fab.wab.merchant.app.resources.mock_kind_both
import com.fab.wab.merchant.app.resources.mock_kind_clinic
import com.fab.wab.merchant.app.resources.mock_kind_men
import com.fab.wab.merchant.app.resources.mock_kind_women
import com.fab.wab.merchant.app.resources.mock_manager
import com.fab.wab.merchant.app.resources.mock_member
import com.fab.wab.merchant.app.resources.mock_none
import com.fab.wab.merchant.app.resources.mock_owner
import com.fab.wab.merchant.app.resources.mock_salon
import com.fab.wab.merchant.app.resources.mock_title
import com.fab.wab.merchant.core.domain.dev.MockMemberPreset
import com.fab.wab.merchant.core.domain.dev.SwitchMockWorldUseCase
import com.fab.wab.merchant.core.domain.salon.Audience
import com.fab.wab.merchant.core.domain.salon.BusinessKind
import com.fab.wab.merchant.core.domain.salon.BusinessType
import com.fab.wab.merchant.core.domain.session.SalonState
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.components.dashboard.salonStateLabel
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.theme.AppTheme
import kotlinx.coroutines.launch
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource

/**
 * Mock builds only (MER-007 scenario switcher): a "DEV" chip over every route opens a sheet that switches the salon
 * lifecycle state and the signed-in member; the salon / permissions are re-read so routing, tabs and tiles follow.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun MockWorldSwitcher(useCase: SwitchMockWorldUseCase, modifier: Modifier = Modifier) {
    if (!useCase.enabled) return
    var open by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val spacing = AppTheme.spacing
    Box(modifier.fillMaxSize().windowInsetsPadding(WindowInsets.statusBars), contentAlignment = Alignment.CenterStart) {
        AppFilterChip(stringResource(Res.string.mock_chip), selected = false, onClick = { open = true })
    }
    if (!open) return
    AppBottomSheet(onDismiss = { open = false }) {
        Column(Modifier.fillMaxWidth().padding(spacing.space16), verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
            AppText(text = stringResource(Res.string.mock_title), style = AppTheme.typography.titleMedium)
            AppText(text = stringResource(Res.string.mock_salon), style = AppTheme.typography.labelLarge)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                SalonState.entries.forEach { state ->
                    AppFilterChip(salonStateLabel(state), selected = false, onClick = {
                        open = false
                        scope.launch { useCase.salonState(state) }
                    })
                }
            }
            AppText(text = stringResource(Res.string.mock_business), style = AppTheme.typography.labelLarge)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                MOCK_KINDS.forEach { (kind, label) ->
                    AppFilterChip(stringResource(label), selected = false, onClick = {
                        open = false
                        scope.launch { useCase.businessKind(kind) }
                    })
                }
            }
            AppText(text = stringResource(Res.string.mock_member), style = AppTheme.typography.labelLarge)
            FlowRow(
                horizontalArrangement = Arrangement.spacedBy(spacing.space8),
                verticalArrangement = Arrangement.spacedBy(spacing.space8),
            ) {
                MockMemberPreset.entries.forEach { preset ->
                    AppFilterChip(stringResource(presetLabel(preset)), selected = false, onClick = {
                        open = false
                        scope.launch { useCase.member(preset) }
                    })
                }
            }
        }
    }
}

/** Salon or clinic presets (BUSINESS_DOMAIN §5.19) the fixtures answer with. */
private val MOCK_KINDS: List<Pair<BusinessKind, StringResource>> = listOf(
    BusinessKind(BusinessType.SALON, Audience.FEMALE) to Res.string.mock_kind_women,
    BusinessKind(BusinessType.SALON, Audience.MALE) to Res.string.mock_kind_men,
    BusinessKind(BusinessType.SALON, Audience.BOTH) to Res.string.mock_kind_both,
    BusinessKind(BusinessType.CLINIC, Audience.BOTH) to Res.string.mock_kind_clinic,
)

private fun presetLabel(preset: MockMemberPreset): StringResource = when (preset) {
    MockMemberPreset.OWNER -> Res.string.mock_owner
    MockMemberPreset.MANAGER -> Res.string.mock_manager
    MockMemberPreset.EMPLOYEE -> Res.string.mock_employee
    MockMemberPreset.NONE -> Res.string.mock_none
}
