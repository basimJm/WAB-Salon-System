package com.fab.wab.merchant.feature.auth.presentation.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDirection
import com.fab.wab.merchant.designsystem.components.dialog.AppBottomSheet
import com.fab.wab.merchant.designsystem.components.feedback.AppEmptyState
import com.fab.wab.merchant.designsystem.components.form.CountryUi
import com.fab.wab.merchant.designsystem.components.form.filterCountries
import com.fab.wab.merchant.designsystem.components.image.AppImage
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.icons.AppIcons
import com.fab.wab.merchant.designsystem.resources.Res as CoreRes
import com.fab.wab.merchant.designsystem.resources.common_close
import com.fab.wab.merchant.designsystem.resources.country_empty
import com.fab.wab.merchant.designsystem.resources.country_picker_title
import com.fab.wab.merchant.designsystem.resources.country_search_placeholder
import com.fab.wab.merchant.designsystem.theme.AppTheme
import org.jetbrains.compose.resources.stringResource

private const val COUNTRY_ROW_TYPE = "country"

/**
 * The design's country sheet (`showCountry`): bottom sheet at 68 % height, radius 26 top, handle, title 16/700 with
 * a 36 dp close circle, 46 dp surface search box (radius 12, 16 dp icon), rows `padding:14px 4px` with flag 22,
 * name 14.5, dial 13.5 muted/600 and an 18 dp accent check on the selected one. `AppCountryPicker` is a full-screen
 * sheet, so this stays private here. Candidate for the design system.
 */
@Composable
internal fun AuthCountrySheet(
    countries: List<CountryUi>,
    selectedCode: String?,
    onSelect: (CountryUi) -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var query by rememberSaveable { mutableStateOf("") }
    val visible = remember(countries, query) { filterCountries(countries, query) }
    AppBottomSheet(onDismiss = onDismiss, modifier = modifier) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(AuthDesign.sheetHeightFraction)
                .padding(
                    start = AuthDesign.sheetPaddingHorizontal,
                    end = AuthDesign.sheetPaddingHorizontal,
                    bottom = AuthDesign.sheetPaddingBottom,
                ),
        ) {
            SheetHeader(onDismiss)
            AuthGap(AuthDesign.sheetHandleBottom)
            SearchBox(query, onQueryChange = { query = it })
            AuthGap(AuthDesign.sheetSearchBottom)
            if (visible.isEmpty()) {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    AppEmptyState(title = stringResource(CoreRes.string.country_empty))
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    items(visible, key = { it.code }, contentType = { COUNTRY_ROW_TYPE }) { country ->
                        CountryRow(country, selected = country.code == selectedCode, onClick = { onSelect(country) })
                    }
                }
            }
        }
    }
}

@Composable
private fun SheetHeader(onClose: () -> Unit, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        AppText(
            text = stringResource(CoreRes.string.country_picker_title),
            style = AppTheme.typography.titleMedium.copy(fontSize = AuthDesign.sheetTitleSize, fontWeight = FontWeight.Bold),
        )
        Box(
            modifier = Modifier
                .size(AppTheme.sizes.touchTarget)
                .clip(AppTheme.shapes.circle)
                .clickable(role = Role.Button, onClick = onClose),
            contentAlignment = Alignment.Center,
        ) {
            Box(
                modifier = Modifier.size(AuthDesign.sheetClose).background(AppTheme.colors.surface, AppTheme.shapes.circle),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    AppIcons.Close,
                    contentDescription = stringResource(CoreRes.string.common_close),
                    tint = AppTheme.colors.ink,
                    modifier = Modifier.size(AppTheme.sizes.iconSmall),
                )
            }
        }
    }
}

@Composable
private fun SearchBox(query: String, onQueryChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    val textStyle = AppTheme.typography.bodyMedium.copy(color = colors.ink, textDirection = TextDirection.Content)
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(AuthDesign.sheetSearchHeight)
            .background(colors.surface, RoundedCornerShape(AuthDesign.sheetSearchRadius))
            .padding(horizontal = AuthDesign.sheetSearchPadding),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8),
    ) {
        Icon(AppIcons.Search, contentDescription = null, tint = colors.faint, modifier = Modifier.size(AuthDesign.sheetSearchIcon))
        BasicTextField(
            value = query,
            onValueChange = onQueryChange,
            modifier = Modifier.weight(1f),
            singleLine = true,
            textStyle = textStyle,
            cursorBrush = SolidColor(colors.accent),
            decorationBox = { inner ->
                Box(contentAlignment = Alignment.CenterStart) {
                    if (query.isEmpty()) {
                        AppText(
                            text = stringResource(CoreRes.string.country_search_placeholder),
                            style = textStyle,
                            color = colors.faint,
                            maxLines = 1,
                        )
                    }
                    inner()
                }
            },
        )
    }
}

@Composable
private fun CountryRow(country: CountryUi, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = AppTheme.colors
    Column(modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(role = Role.Button, onClick = onClick)
                .padding(vertical = AuthDesign.sheetRowVertical, horizontal = AuthDesign.sheetRowHorizontal),
            horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space12),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val flag = country.flagUrl
            if (flag != null) {
                AppImage(url = flag, modifier = Modifier.size(AuthDesign.sheetFlag).clip(AppTheme.shapes.extraSmall))
            }
            AppText(
                text = country.name,
                modifier = Modifier.weight(1f),
                style = AppTheme.typography.bodyMedium.copy(fontSize = AuthDesign.sheetNameSize),
                maxLines = 1,
            )
            AppText(
                text = country.dialCode,
                style = AppTheme.typography.labelMedium.copy(fontSize = AuthDesign.sheetDialSize, textDirection = TextDirection.Ltr),
                color = colors.muted,
                maxLines = 1,
            )
            if (selected) {
                Icon(
                    AppIcons.Check,
                    contentDescription = null,
                    tint = colors.gradientStart,
                    modifier = Modifier.size(AuthDesign.sheetCheck),
                )
            }
        }
        Box(Modifier.fillMaxWidth().height(AppTheme.sizes.hairline).background(colors.line))
    }
}
