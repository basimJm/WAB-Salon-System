package com.fab.wab.customer.feature.booking.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextAlign
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.booking.domain.model.BookingFlowDefaults
import com.fab.wab.customer.feature.booking.domain.model.DraftPerson
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiAction
import com.fab.wab.customer.feature.booking.presentation.controller.contract.BookingFlowContract.UiState
import com.fab.wab.customer.feature.booking.presentation.resources.Res
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companion_add
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companion_limit
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companion_remove
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companions_counter
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companions_subtitle
import com.fab.wab.customer.feature.booking.presentation.resources.booking_companions_title
import com.fab.wab.customer.feature.booking.presentation.resources.booking_continue
import com.fab.wab.customer.feature.booking.presentation.resources.booking_just_me
import com.fab.wab.customer.feature.booking.presentation.resources.booking_persons_title
import org.jetbrains.compose.resources.stringResource

/**
 * Step 4 (`st.s4`): title `mb 6`, subtitle `13px muted mb 16`, two 96 dp choice cards (`gap:10px;mb 18`), the
 * "People in this booking" row with the `x of 5 companions` counter, person cards (`gap:10px`) and the limit note.
 */
@Composable
internal fun CompanionsStep(state: UiState, onAction: (UiAction) -> Unit) {
    val spacing = AppTheme.spacing
    val colors = AppTheme.colors
    val atLimit = !state.canAddCompanion
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(start = spacing.space20, top = spacing.space4, end = spacing.space20, bottom = spacing.space20),
    ) {
        StepTitle(text = stringResource(Res.string.booking_companions_title), modifier = Modifier.padding(bottom = spacing.space6))
        AppText(
            text = stringResource(Res.string.booking_companions_subtitle),
            modifier = Modifier.padding(bottom = spacing.space16),
            style = AppTheme.typography.bodyMedium,
            color = colors.muted,
        )
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(spacing.space10)) {
            JustMeCard(
                label = stringResource(if (state.companionsCount > 0) Res.string.booking_continue else Res.string.booking_just_me),
                onClick = { onAction(UiAction.OnJustMe) },
                modifier = Modifier.weight(1f),
            )
            AddCompanionCard(atLimit = atLimit, onClick = { onAction(UiAction.OnAddCompanion) }, modifier = Modifier.weight(1f))
        }
        Row(
            modifier = Modifier.fillMaxWidth().padding(top = spacing.space20, bottom = spacing.space10),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            AppText(text = stringResource(Res.string.booking_persons_title), style = AppTheme.typography.titleMedium)
            AppText(
                text = stringResource(Res.string.booking_companions_counter, state.companionsCount, BookingFlowDefaults.MAX_COMPANIONS),
                style = AppTheme.typography.labelMedium,
                color = colors.accent,
            )
        }
        Column(verticalArrangement = Arrangement.spacedBy(spacing.space10)) {
            state.persons.forEachIndexed { index, person ->
                PersonCard(person, removable = index > 0, onRemove = { onAction(UiAction.OnRemovePerson(index)) })
            }
        }
        if (atLimit) {
            AppText(
                text = stringResource(Res.string.booking_companion_limit),
                modifier = Modifier.fillMaxWidth().padding(top = spacing.space12),
                style = AppTheme.typography.bodySmall,
                color = colors.danger,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/** Design `justMe`: `height:96px;border-radius:18px;border:1.5px solid var(--line);background:var(--card)`, accent icon, `14px 700`. */
@Composable
private fun JustMeCard(label: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.companionCardRadius)
    ChoiceCardBody(
        icon = AppIcons.Profile,
        label = label,
        tint = colors.accent,
        labelColor = colors.ink,
        modifier = modifier
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .clickable(role = Role.Button, onClick = onClick),
    )
}

/**
 * Design `addStyle`: `border:1.5px dashed #A855F7;background:var(--soft);color:var(--accent)`; at the limit the dash is
 * `var(--line)`, the fill `var(--surface)`, the text `var(--faint)` and the card `opacity:.6`.
 */
@Composable
private fun AddCompanionCard(atLimit: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val shape = roundedShape(BookingDesignConstants.companionCardRadius)
    val tint = if (atLimit) colors.faint else colors.accent
    ChoiceCardBody(
        icon = AppIcons.Add,
        label = stringResource(Res.string.booking_companion_add),
        tint = tint,
        labelColor = tint,
        modifier = modifier
            .alpha(if (atLimit) BookingDesignConstants.LIMIT_CARD_ALPHA else 1f)
            .clip(shape)
            .background(if (atLimit) colors.surface else colors.soft)
            .dashedBorder(
                width = AppTheme.sizes.borderWidth,
                color = if (atLimit) colors.line else colors.gradientEnd,
                radius = BookingDesignConstants.companionCardRadius,
                dash = BookingDesignConstants.dashLength,
            )
            .clickable(enabled = !atLimit, role = Role.Button, onClick = onClick),
    )
}

@Composable
private fun ChoiceCardBody(icon: ImageVector, label: String, tint: Color, labelColor: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.height(AppTheme.sizes.choiceCardHeight).padding(AppTheme.spacing.space8),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8, Alignment.CenterVertically),
    ) {
        Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(AppTheme.sizes.iconLarge))
        AppText(text = label, style = AppTheme.typography.titleSmall, color = labelColor, textAlign = TextAlign.Center, maxLines = 1)
    }
}

/**
 * Design `personCards`: `gap:12px;padding:14px;border-radius:16px;background:var(--surface)`; 40 dp soft circle with the
 * initial (`700 accent`), name `14px 700` + bride tag, one-line subtitle `12px muted`, 34 dp danger-tinted remove button.
 */
@Composable
private fun PersonCard(person: DraftPerson, removable: Boolean, onRemove: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val spacing = AppTheme.spacing
    Row(
        modifier = modifier.fillMaxWidth().clip(AppTheme.shapes.large).background(colors.surface).padding(spacing.space14),
        horizontalArrangement = Arrangement.spacedBy(spacing.space12),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier.size(BookingDesignConstants.initialCircle).background(colors.soft, AppTheme.shapes.circle),
            contentAlignment = Alignment.Center,
        ) {
            AppText(text = person.name.trim().take(1), style = AppTheme.typography.titleSmall, color = colors.accent)
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(spacing.space2)) {
            PersonNameRow(name = person.name, isBride = person.isBride)
            AppText(text = personSubtitle(person), style = AppTheme.typography.bodySmall, color = colors.muted, maxLines = 1)
        }
        if (removable) {
            Box(
                modifier = Modifier
                    .size(BookingDesignConstants.removeButton)
                    .clip(AppTheme.shapes.circle)
                    .background(colors.danger.copy(alpha = BookingDesignConstants.DANGER_SOFT_ALPHA))
                    .clickable(role = Role.Button, onClick = onRemove),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    AppIcons.Close,
                    contentDescription = stringResource(Res.string.booking_companion_remove),
                    tint = colors.danger,
                    modifier = Modifier.size(AppTheme.sizes.iconSmall),
                )
            }
        }
    }
}
