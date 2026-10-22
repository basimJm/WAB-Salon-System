package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.designsystem.components.glass.glassBackground
import com.fab.wab.customer.designsystem.components.text.AppText
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.designsystem.theme.AppTheme
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LegalSlugs
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.auth_language_switch
import com.fab.wab.customer.feature.auth.presentation.resources.login_back
import com.fab.wab.customer.feature.auth.presentation.resources.login_contact
import com.fab.wab.customer.feature.auth.presentation.resources.login_privacy
import com.fab.wab.customer.feature.auth.presentation.resources.login_terms
import com.fab.wab.customer.feature.auth.presentation.resources.login_theme
import org.jetbrains.compose.resources.stringResource

/**
 * Bordered 40 dp pill of the auth top rows (`height:40px;min-width:44px;border-radius:12px;border:1px solid
 * var(--line);background:var(--card)`): a text label ("EN" / "ع") or an 18 dp icon. Candidate for the design system.
 */
@Composable
internal fun AuthPillButton(
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    label: String? = null,
    icon: ImageVector? = null,
    iconSize: Dp = AuthDesign.pillIcon,
) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(AuthDesign.pillRadius)
    // The visual pill is 40 dp high; the clickable area keeps the 48 dp accessibility minimum.
    Box(
        modifier = modifier
            .defaultMinSize(minWidth = AuthDesign.pillMinWidth, minHeight = AppTheme.sizes.touchTarget)
            .padding(vertical = AuthDesign.pillVerticalInset)
            .height(AppTheme.sizes.buttonHeightCompact)
            .defaultMinSize(minWidth = AuthDesign.pillMinWidth)
            .clip(shape)
            .clickable(role = Role.Button, onClickLabel = contentDescription, onClick = onClick)
            .glassBackground(AppTheme.glass, shape)
            .padding(horizontal = if (label != null) AuthDesign.pillHorizontalPadding else AppTheme.spacing.space0),
        contentAlignment = Alignment.Center,
    ) {
        if (label != null) {
            AppText(
                text = label,
                style = AppTheme.typography.labelMedium.copy(fontSize = AuthDesign.pillLabelSize, fontWeight = FontWeight.Bold),
                color = colors.ink,
                maxLines = 1,
            )
        } else if (icon != null) {
            Icon(icon, contentDescription = contentDescription, tint = colors.ink, modifier = Modifier.size(iconSize))
        }
    }
}

/** Top row shared by S11/S12/S13: back pill at the start (when given), language + theme pills at the end (gap 8). */
@Composable
internal fun AuthTopIcons(
    themeMode: ThemeMode,
    onLanguageToggle: () -> Unit,
    onThemeToggle: () -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth().defaultMinSize(minHeight = AuthDesign.topRowMinHeight),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        if (onBack != null) AuthBackPill(onBack)
        Spacer(Modifier.weight(1f))
        AuthPillButton(
            contentDescription = stringResource(Res.string.auth_language_switch),
            onClick = onLanguageToggle,
            label = stringResource(Res.string.auth_language_switch),
        )
        AuthPillButton(
            contentDescription = stringResource(Res.string.login_theme),
            onClick = onThemeToggle,
            icon = if (themeMode == ThemeMode.DARK) AppIcons.ThemeLight else AppIcons.ThemeDark,
        )
    }
}

/** `width:44px;height:40px` pill with the 20 dp chevron that mirrors in RTL (`AppIcons.Back` is auto-mirrored). */
@Composable
internal fun AuthBackPill(onBack: () -> Unit, modifier: Modifier = Modifier) {
    AuthPillButton(
        contentDescription = stringResource(Res.string.login_back),
        onClick = onBack,
        modifier = modifier,
        icon = AppIcons.Back,
        iconSize = AuthDesign.pillBackIcon,
    )
}

/** Privacy · Terms · Contact as 12 px muted text links (`gap:6px 14px`), wrapping on narrow widths. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun AuthLegalLinks(onLegalClick: (String) -> Unit, modifier: Modifier = Modifier) {
    FlowRow(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AuthDesign.legalGapHorizontal, Alignment.CenterHorizontally),
        verticalArrangement = Arrangement.spacedBy(AuthDesign.legalGapVertical),
    ) {
        AuthLegalLink(stringResource(Res.string.login_privacy), onClick = { onLegalClick(LegalSlugs.PRIVACY) })
        AuthLegalLink(stringResource(Res.string.login_terms), onClick = { onLegalClick(LegalSlugs.TERMS) })
        AuthLegalLink(stringResource(Res.string.login_contact), onClick = { onLegalClick(LegalSlugs.CONTACT) })
    }
}

@Composable
private fun AuthLegalLink(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    AppText(
        text = text,
        modifier = modifier
            .clip(AppTheme.shapes.small)
            .clickable(role = Role.Button, onClick = onClick)
            .padding(AuthDesign.legalTopPadding),
        style = AppTheme.typography.bodySmall.copy(fontSize = AuthDesign.legalSize),
        color = AppTheme.colors.muted,
    )
}

/** "No account? Register" / "I already have an account – Log in": 13.5 px muted text + bold accent link, gap 5. */
@Composable
internal fun AuthFooterLink(text: String, linkText: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val style = AppTheme.typography.bodyMedium.copy(fontSize = AuthDesign.footerSize)
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(AuthDesign.footerGap, Alignment.CenterHorizontally),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AppText(text = text, style = style, color = AppTheme.colors.muted)
        AppText(
            text = linkText,
            modifier = Modifier
                .clip(AppTheme.shapes.small)
                .clickable(role = Role.Button, onClick = onClick)
                .padding(vertical = AppTheme.spacing.space10, horizontal = AppTheme.spacing.space4),
            style = style.copy(fontWeight = FontWeight.Bold),
            color = AppTheme.colors.accent,
        )
    }
}

/** The auth form card: radius 24, hairline border, `0 16px 40px rgba(31,34,51,.08)` shadow, card background. */
@Composable
internal fun AuthCard(
    modifier: Modifier = Modifier,
    verticalPadding: Dp = AuthDesign.loginCardVertical,
    horizontalPadding: Dp = AuthDesign.loginCardHorizontal,
    content: @Composable () -> Unit,
) {
    val colors = AppTheme.colors
    val shape = RoundedCornerShape(AuthDesign.cardRadius)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .glassBackground(AppTheme.glass, shape)
            .padding(vertical = verticalPadding, horizontal = horizontalPadding),
    ) {
        content()
    }
}

/** Field label: accent, 600, 12.5 px (login) or 12 px (register). */
@Composable
internal fun AuthFieldLabel(text: String, modifier: Modifier = Modifier, compact: Boolean = false) {
    AppText(
        text = text,
        modifier = modifier,
        style = AppTheme.typography.labelMedium.copy(fontSize = if (compact) AuthDesign.registerLabelSize else AuthDesign.labelSize),
        color = AppTheme.colors.accent,
    )
}

/** Field error: danger, 12 px / margin-top 6 (login) or 11.5 px / margin-top 5 (register). */
@Composable
internal fun AuthFieldError(text: String, modifier: Modifier = Modifier, compact: Boolean = false) {
    AppText(
        text = text,
        modifier = modifier.padding(top = if (compact) AuthDesign.registerErrorTop else AuthDesign.errorTop),
        style = AppTheme.typography.bodySmall.copy(fontSize = if (compact) AuthDesign.registerErrorSize else AuthDesign.errorSize),
        color = AppTheme.colors.danger,
    )
}

/** Vertical rhythm helper for the design's explicit `margin`/`height` spacers. */
@Composable
internal fun AuthGap(height: Dp) {
    Spacer(Modifier.height(height))
}

/** Column of a field block: label, the field, then the error line when present. */
@Composable
internal fun AuthFieldBlock(
    label: String,
    error: String?,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
    field: @Composable () -> Unit,
) {
    Column(modifier = modifier.fillMaxWidth()) {
        AuthFieldLabel(label, compact = compact)
        AuthGap(if (compact) AppTheme.spacing.space6 else AppTheme.spacing.space8)
        field()
        if (error != null) AuthFieldError(error, compact = compact)
    }
}
