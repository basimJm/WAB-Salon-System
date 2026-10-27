package com.fab.wab.merchant.feature.content.presentation.controller.vm

import com.fab.wab.merchant.core.analytics.AnalyticsAction
import com.fab.wab.merchant.core.analytics.AnalyticsTracker
import com.fab.wab.merchant.core.analytics.analyticsParams
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.mvi.BaseViewModel
import com.fab.wab.merchant.core.ui.external.ExternalActions
import com.fab.wab.merchant.designsystem.components.external.ExternalHandoff
import com.fab.wab.merchant.designsystem.components.external.HandoffTexts
import com.fab.wab.merchant.designsystem.components.external.ResourceHandoffTexts
import com.fab.wab.merchant.designsystem.components.feedback.appErrorText
import com.fab.wab.merchant.feature.content.domain.model.ContentSlugs
import com.fab.wab.merchant.feature.content.domain.usecase.LoadContentPageUseCase
import com.fab.wab.merchant.feature.content.presentation.analytics.ContentAnalytics
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContactChannel
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContentPageContract.SideEffect
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContentPageContract.UiAction
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContentPageContract.UiState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class ContentPageDependencies(
    val loadPage: LoadContentPageUseCase,
    val config: AppConfigRepository,
    val external: ExternalActions,
    val analytics: AnalyticsTracker,
    val errorText: suspend (AppError) -> String = ::appErrorText,
    val handoffTexts: HandoffTexts = ResourceHandoffTexts,
)

/** S23: privacy / terms / about from the server; `contact` shows the config's phone, WhatsApp and email. */
class ContentPageViewModel(
    private val slug: String,
    private val deps: ContentPageDependencies,
    testScope: CoroutineScope? = null,
) : BaseViewModel<UiState, UiAction, SideEffect>(initialState = UiState(slug = slug, isContact = slug == ContentSlugs.CONTACT), testScope) {

    private var started = false
    private val handoff = ExternalHandoff(deps.external, deps.handoffTexts) { emitSideEffect(SideEffect.ShowInfo(it)) }

    override fun onStart() {
        if (started) return
        started = true
        if (uiState.value.isContact) {
            scope.launch { deps.config.current.collect { updateState { copy(loading = false, contact = it?.contact) } } }
        } else {
            load()
        }
    }

    override fun handle(event: UiAction) {
        when (event) {
            UiAction.OnRetry -> if (!uiState.value.isContact) load()
            is UiAction.OnLinkClick -> {
                track(ContentAnalytics.ACTION_LINK, ContentAnalytics.PARAM_SLUG to slug)
                scope.launch { handoff.url(event.url) }
            }
            is UiAction.OnContactChannel -> contact(event.channel)
        }
    }

    private fun contact(channel: ContactChannel) {
        val info = uiState.value.contact ?: return
        track(ContentAnalytics.ACTION_CONTACT, ContentAnalytics.PARAM_VALUE to channel.name.lowercase())
        scope.launch {
            when (channel) {
                ContactChannel.CALL -> handoff.call(info.phone)
                ContactChannel.WHATSAPP -> handoff.contactWabWhatsApp(info.whatsapp)
                ContactChannel.EMAIL -> handoff.email(info.email)
            }
        }
    }

    private fun load() {
        scope.launch {
            updateState { copy(loading = true, error = null, offline = false) }
            when (val result = deps.loadPage(slug)) {
                is AppResult.Success -> updateState { copy(loading = false, blocks = result.data) }
                is AppResult.Error -> {
                    val message = deps.errorText(result.appError)
                    updateState { copy(loading = false, offline = result.appError is AppError.NetworkError, error = message) }
                }
                AppResult.Loading -> Unit
            }
        }
    }

    private fun track(action: String, vararg params: Pair<String, String>) {
        deps.analytics.trackAction(AnalyticsAction(action, analyticsParams { params.forEach { (k, v) -> text(k, v) } }))
    }
}
