package com.fab.wab.customer.feature.auth.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.fab.wab.customer.core.domain.ThemeMode
import com.fab.wab.customer.designsystem.components.button.AppIconButton
import com.fab.wab.customer.designsystem.components.button.AppTextButton
import com.fab.wab.customer.designsystem.icons.AppIcons
import com.fab.wab.customer.feature.auth.presentation.controller.contract.LegalSlugs
import com.fab.wab.customer.feature.auth.presentation.resources.Res
import com.fab.wab.customer.feature.auth.presentation.resources.login_back
import com.fab.wab.customer.feature.auth.presentation.resources.login_contact
import com.fab.wab.customer.feature.auth.presentation.resources.login_language
import com.fab.wab.customer.feature.auth.presentation.resources.login_privacy
import com.fab.wab.customer.feature.auth.presentation.resources.login_terms
import com.fab.wab.customer.feature.auth.presentation.resources.login_theme
import org.jetbrains.compose.resources.stringResource

/** Top row shared by Login and Register (PRD S11/S12): back at the start, language + theme icons at the end. */
@Composable
internal fun AuthTopIcons(
    themeMode: ThemeMode,
    onLanguageToggle: () -> Unit,
    onThemeToggle: () -> Unit,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
) {
    Row(modifier = modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        if (onBack != null) {
            AppIconButton(icon = AppIcons.Back, contentDescription = stringResource(Res.string.login_back), onClick = onBack)
        }
        Spacer(Modifier.weight(1f))
        AppIconButton(icon = AppIcons.Language, contentDescription = stringResource(Res.string.login_language), onClick = onLanguageToggle)
        AppIconButton(
            icon = if (themeMode == ThemeMode.DARK) AppIcons.ThemeLight else AppIcons.ThemeDark,
            contentDescription = stringResource(Res.string.login_theme),
            onClick = onThemeToggle,
        )
    }
}

/** Privacy · Terms · Contact links (S23 slugs), wrapping when the width is short. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun AuthLegalLinks(onLegalClick: (String) -> Unit, modifier: Modifier = Modifier) {
    FlowRow(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
        AppTextButton(text = stringResource(Res.string.login_privacy), onClick = { onLegalClick(LegalSlugs.PRIVACY) })
        AppTextButton(text = stringResource(Res.string.login_terms), onClick = { onLegalClick(LegalSlugs.TERMS) })
        AppTextButton(text = stringResource(Res.string.login_contact), onClick = { onLegalClick(LegalSlugs.CONTACT) })
    }
}
