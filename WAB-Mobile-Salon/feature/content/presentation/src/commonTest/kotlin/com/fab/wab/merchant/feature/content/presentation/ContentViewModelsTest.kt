package com.fab.wab.merchant.feature.content.presentation

import com.fab.wab.merchant.core.analytics.NoOpAnalyticsTracker
import com.fab.wab.merchant.core.domain.AppError
import com.fab.wab.merchant.core.domain.AppResult
import com.fab.wab.merchant.core.domain.config.AppConfig
import com.fab.wab.merchant.core.domain.config.AppConfigRepository
import com.fab.wab.merchant.core.domain.config.ContactInfo
import com.fab.wab.merchant.core.domain.config.MaintenancePolicy
import com.fab.wab.merchant.core.domain.config.OtpConfig
import com.fab.wab.merchant.core.domain.config.UpdatePolicy
import com.fab.wab.merchant.core.domain.config.UpdateStatus
import com.fab.wab.merchant.core.ui.external.FakeExternalActions
import com.fab.wab.merchant.feature.content.domain.model.ContentPage
import com.fab.wab.merchant.feature.content.domain.model.ContentSlugs
import com.fab.wab.merchant.feature.content.domain.model.FaqItem
import com.fab.wab.merchant.feature.content.domain.model.RichBlock
import com.fab.wab.merchant.feature.content.domain.model.RichSpan
import com.fab.wab.merchant.feature.content.domain.repository.ContentRepository
import com.fab.wab.merchant.feature.content.domain.usecase.LoadContentPageUseCase
import com.fab.wab.merchant.feature.content.domain.usecase.LoadFaqsUseCase
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContactChannel
import com.fab.wab.merchant.feature.content.presentation.controller.contract.ContentPageContract
import com.fab.wab.merchant.feature.content.presentation.controller.contract.FaqContract
import com.fab.wab.merchant.feature.content.presentation.controller.vm.ContentPageDependencies
import com.fab.wab.merchant.feature.content.presentation.controller.vm.ContentPageViewModel
import com.fab.wab.merchant.feature.content.presentation.controller.vm.FaqDependencies
import com.fab.wab.merchant.feature.content.presentation.controller.vm.FaqViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

private class ContentFake : ContentRepository {
    val slugs = mutableListOf<String>()
    var pageResult: AppResult<ContentPage> = AppResult.Success(ContentPage("TERMS", "<p>Hello <b>world</b></p>"))
    var faqResult: AppResult<List<FaqItem>> = AppResult.Success(
        listOf(FaqItem("f1", "Q1", "A1"), FaqItem("f1", "dup", "dup"), FaqItem("f2", "Q2", "A2")),
    )
    override suspend fun page(slug: String): AppResult<ContentPage> {
        slugs += slug
        return pageResult
    }
    override suspend fun faqs(): AppResult<List<FaqItem>> = faqResult
}

private class ConfigFake(contact: ContactInfo?) : AppConfigRepository {
    private val config = AppConfig(UpdatePolicy(UpdateStatus.OK), MaintenancePolicy(false, null), 5.0, OtpConfig(6, 60), contact)
    override val current: StateFlow<AppConfig?> = MutableStateFlow(config)
    override suspend fun refresh(): AppResult<AppConfig> = AppResult.Success(config)
}

@OptIn(ExperimentalCoroutinesApi::class)
class ContentViewModelsTest {

    private val repository = ContentFake()
    private val external = FakeExternalActions()

    private fun TestScope.page(slug: String, contact: ContactInfo? = null): ContentPageViewModel {
        val deps = ContentPageDependencies(
            LoadContentPageUseCase(repository),
            ConfigFake(contact),
            external,
            NoOpAnalyticsTracker,
            errorText = { "error" },
        )
        val vm = ContentPageViewModel(slug, deps, backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        vm.onStart()
        return vm
    }

    @Test
    fun legalPageLoadsParsedBlocksAndOpensLinks() = runTest(UnconfinedTestDispatcher()) {
        val vm = page(ContentSlugs.TERMS)
        assertEquals(listOf(ContentSlugs.TERMS), repository.slugs)
        assertEquals(listOf(RichBlock.Paragraph(listOf(RichSpan("Hello "), RichSpan("world", bold = true)))), vm.state.value.blocks)
        vm.onEvent(ContentPageContract.UiAction.OnLinkClick("https://x.y"))
        assertEquals(listOf("url:https://x.y"), external.calls)
        repository.pageResult = AppResult.Error(AppError.NetworkError("offline"))
        vm.onEvent(ContentPageContract.UiAction.OnRetry)
        assertTrue(vm.state.value.offline)
        assertEquals("error", vm.state.value.error)
    }

    @Test
    fun contactPageUsesTheConfigAndNeverCallsTheServer() = runTest(UnconfinedTestDispatcher()) {
        val vm = page(ContentSlugs.CONTACT, ContactInfo("+962790000001", "+962790000002", "help@wab.jo"))
        assertTrue(vm.state.value.isContact)
        assertFalse(vm.state.value.loading)
        assertTrue(repository.slugs.isEmpty())
        vm.onEvent(ContentPageContract.UiAction.OnContactChannel(ContactChannel.EMAIL))
        vm.onEvent(ContentPageContract.UiAction.OnContactChannel(ContactChannel.CALL))
        assertEquals(listOf("mailto:help@wab.jo", "tel:+962790000001"), external.calls)
    }

    @Test
    fun faqLoadsDistinctItemsAndTogglesAnswers() = runTest(UnconfinedTestDispatcher()) {
        val vm = FaqViewModel(FaqDependencies(LoadFaqsUseCase(repository), NoOpAnalyticsTracker, errorText = { "error" }), backgroundScope)
        backgroundScope.launch { vm.state.collect {} }
        vm.onStart()
        assertEquals(listOf("f1", "f2"), vm.state.value.items.map { it.id })
        vm.onEvent(FaqContract.UiAction.OnToggle("f1"))
        assertEquals(setOf("f1"), vm.state.value.expanded)
        vm.onEvent(FaqContract.UiAction.OnToggle("f1"))
        assertTrue(vm.state.value.expanded.isEmpty())
    }
}
