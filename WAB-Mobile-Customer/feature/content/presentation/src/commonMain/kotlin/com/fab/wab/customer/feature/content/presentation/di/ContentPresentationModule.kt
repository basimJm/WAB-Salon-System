package com.fab.wab.customer.feature.content.presentation.di

import com.fab.wab.customer.feature.content.presentation.controller.vm.ContentPageDependencies
import com.fab.wab.customer.feature.content.presentation.controller.vm.ContentPageViewModel
import com.fab.wab.customer.feature.content.presentation.controller.vm.FaqDependencies
import com.fab.wab.customer.feature.content.presentation.controller.vm.FaqViewModel
import org.koin.core.module.dsl.viewModel
import org.koin.dsl.module

val contentPresentationModule = module {
    factory { ContentPageDependencies(loadPage = get(), config = get(), external = get(), analytics = get()) }
    viewModel { (slug: String) -> ContentPageViewModel(slug, deps = get()) }
    factory { FaqDependencies(loadFaqs = get(), analytics = get()) }
    viewModel { FaqViewModel(deps = get()) }
}
