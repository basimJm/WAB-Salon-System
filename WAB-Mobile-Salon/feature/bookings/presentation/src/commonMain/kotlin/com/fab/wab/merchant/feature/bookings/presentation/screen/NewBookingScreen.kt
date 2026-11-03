package com.fab.wab.merchant.feature.bookings.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import com.fab.wab.merchant.designsystem.components.button.AppPrimaryButton
import com.fab.wab.merchant.designsystem.components.button.ButtonKind
import com.fab.wab.merchant.designsystem.components.chip.AppFilterChip
import com.fab.wab.merchant.designsystem.components.feedback.AppErrorState
import com.fab.wab.merchant.designsystem.components.feedback.AppLoadingIndicator
import com.fab.wab.merchant.designsystem.components.form.AppCountryPicker
import com.fab.wab.merchant.designsystem.components.form.AppKeyboards
import com.fab.wab.merchant.designsystem.components.form.AppPhoneField
import com.fab.wab.merchant.designsystem.components.form.CountryUi
import com.fab.wab.merchant.designsystem.components.layout.AppScreen
import com.fab.wab.merchant.designsystem.components.navigation.AppTopBar
import com.fab.wab.merchant.designsystem.components.text.AppText
import com.fab.wab.merchant.designsystem.components.textfield.AppTextField
import com.fab.wab.merchant.designsystem.components.upload.AppMediaPicker
import com.fab.wab.merchant.designsystem.theme.AppTheme
import com.fab.wab.merchant.feature.bookings.domain.model.CustomerGender
import com.fab.wab.merchant.feature.bookings.presentation.analytics.BookingsAnalytics
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.LookupStatus
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.UiAction
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingContract.UiState
import com.fab.wab.merchant.feature.bookings.presentation.controller.contract.NewBookingField
import com.fab.wab.merchant.feature.bookings.presentation.resources.Res
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_check
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_confirm
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_customer
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_gender
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_gender_error
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_gender_men
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_gender_women
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_name
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_name_error
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_not_registered
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_pay_note
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_phone
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_phone_error
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_registered
import com.fab.wab.merchant.feature.bookings.presentation.resources.nb_registered_hint
import com.fab.wab.merchant.feature.bookings.presentation.resources.new_booking
import org.jetbrains.compose.resources.stringResource

/** BUSINESS_DOMAIN §5.20 "New booking" (MER-085): customer, then the booking, then Confirm. */
@Composable
fun NewBookingScreen(state: UiState, onAction: (UiAction) -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    TrackScreen(BookingsAnalytics.SCREEN_NEW_BOOKING)
    val spacing = AppTheme.spacing
    AppScreen(modifier = modifier, topBar = { AppTopBar(title = stringResource(Res.string.new_booking), onBack = onBack) }) { padding ->
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { AppLoadingIndicator() }
            state.loadError != null -> AppErrorState(onRetry = { onAction(UiAction.OnRetry) }, message = state.loadError)
            else -> Column(
                modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(spacing.space16),
                verticalArrangement = Arrangement.spacedBy(spacing.space12),
            ) {
                CustomerSection(state, onAction)
                if (state.customerChecked) {
                    BookingSection(state, onAction)
                    AppText(text = stringResource(Res.string.nb_pay_note), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
                    AppPrimaryButton(
                        text = stringResource(Res.string.nb_confirm),
                        onClick = { onAction(UiAction.OnSubmit) },
                        modifier = Modifier.fillMaxWidth(),
                        enabled = state.canSubmit,
                        loading = state.submitting,
                    )
                }
            }
        }
    }
    if (state.countryPickerOpen) {
        AppCountryPicker(
            countries = state.countries.map { CountryUi(it.code, it.name, it.dialCode, it.flagUrl, it.phoneRegex) },
            selectedCode = state.countryCode,
            onSelect = { onAction(UiAction.OnCountrySelect(it.code)) },
            onDismiss = { onAction(UiAction.OnCountryDismiss) },
        )
    }
    AppMediaPicker(state.media) { onAction(UiAction.OnMedia(it)) }
    NewBookingDateDialog(state, onAction)
}

@Composable
private fun CustomerSection(state: UiState, onAction: (UiAction) -> Unit) {
    val errors = state.visibleErrors
    SectionCard(stringResource(Res.string.nb_customer)) {
        AppPhoneField(
            value = state.number,
            onValueChange = { onAction(UiAction.OnNumber(it)) },
            country = state.country?.let { CountryUi(it.code, it.name, it.dialCode, it.flagUrl, it.phoneRegex) },
            onCountryClick = { onAction(UiAction.OnCountryClick) },
            label = stringResource(Res.string.nb_phone),
            error = if (NewBookingField.PHONE in errors) stringResource(Res.string.nb_phone_error) else null,
        )
        if (!state.customerChecked) {
            AppButton(
                text = stringResource(Res.string.nb_check),
                onClick = { onAction(UiAction.OnCheck) },
                modifier = Modifier.fillMaxWidth(),
                kind = ButtonKind.Secondary,
                enabled = state.canCheck,
                loading = state.lookupStatus == LookupStatus.CHECKING,
            )
            return@SectionCard
        }
        val firstName = state.lookup?.firstName
        if (state.isRegistered && firstName != null) {
            AppText(text = stringResource(Res.string.nb_registered, firstName), style = AppTheme.typography.titleSmall)
            AppText(text = stringResource(Res.string.nb_registered_hint), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        } else if (!state.isRegistered) {
            AppText(text = stringResource(Res.string.nb_not_registered), style = AppTheme.typography.bodySmall, color = AppTheme.colors.muted)
        }
        if (state.asksName) {
            AppTextField(
                value = state.name,
                onValueChange = { onAction(UiAction.OnName(it)) },
                label = stringResource(Res.string.nb_name),
                error = if (NewBookingField.NAME in errors) stringResource(Res.string.nb_name_error) else null,
                keyboardOptions = AppKeyboards.name,
            )
        }
        if (state.asksGender) GenderChoice(state, onAction)
    }
}

@Composable
private fun GenderChoice(state: UiState, onAction: (UiAction) -> Unit) {
    AppText(text = stringResource(Res.string.nb_gender), style = AppTheme.typography.labelLarge)
    Row(horizontalArrangement = Arrangement.spacedBy(AppTheme.spacing.space8)) {
        AppFilterChip(
            text = stringResource(Res.string.nb_gender_men),
            selected = state.gender == CustomerGender.MALE,
            onClick = { onAction(UiAction.OnGender(CustomerGender.MALE)) },
        )
        AppFilterChip(
            text = stringResource(Res.string.nb_gender_women),
            selected = state.gender == CustomerGender.FEMALE,
            onClick = { onAction(UiAction.OnGender(CustomerGender.FEMALE)) },
        )
    }
    if (NewBookingField.GENDER in state.visibleErrors) {
        AppText(text = stringResource(Res.string.nb_gender_error), style = AppTheme.typography.bodySmall, color = AppTheme.colors.danger)
    }
}
