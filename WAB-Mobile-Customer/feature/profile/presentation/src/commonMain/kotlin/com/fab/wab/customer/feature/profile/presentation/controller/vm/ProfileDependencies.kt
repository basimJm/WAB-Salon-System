package com.fab.wab.customer.feature.profile.presentation.controller.vm

import com.fab.wab.customer.core.analytics.AnalyticsTracker
import com.fab.wab.customer.core.common.AppEnvironment
import com.fab.wab.customer.core.domain.AppError
import com.fab.wab.customer.core.domain.AppearanceSettings
import com.fab.wab.customer.core.domain.config.AppConfigRepository
import com.fab.wab.customer.core.domain.session.SessionStore
import com.fab.wab.customer.core.ui.external.ExternalActions
import com.fab.wab.customer.core.ui.media.ImagePicker
import com.fab.wab.customer.core.ui.permission.PermissionFlow
import com.fab.wab.customer.designsystem.components.feedback.appErrorText
import com.fab.wab.customer.feature.auth.domain.usecase.LogoutUseCase
import com.fab.wab.customer.feature.auth.domain.usecase.SetPushEnabledUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.DeleteAccountUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.DeleteAvatarUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.LoadProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UpdateGuestProfileUseCase
import com.fab.wab.customer.feature.profile.domain.usecase.UploadAvatarUseCase

class ProfileDependencies(
    val sessionStore: SessionStore,
    val appearance: AppearanceSettings,
    val config: AppConfigRepository,
    val environment: AppEnvironment,
    val loadProfile: LoadProfileUseCase,
    val uploadAvatar: UploadAvatarUseCase,
    val deleteAvatar: DeleteAvatarUseCase,
    val deleteAccount: DeleteAccountUseCase,
    val updateGuest: UpdateGuestProfileUseCase,
    val logout: LogoutUseCase,
    val setPushEnabled: SetPushEnabledUseCase,
    val imagePicker: ImagePicker,
    val permissions: PermissionFlow,
    val external: ExternalActions,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
)
