package com.fab.wab.customer.feature.onboarding.domain.model

/** The four bundled pages of S01 in order (texts and illustrations live in the presentation resources). */
enum class OnboardingPage {
    DISCOVER,
    BOOK,
    BRIDE,
    PAY,
    ;

    val isLast: Boolean get() = ordinal == entries.lastIndex

    companion object {
        val count: Int get() = entries.size
        fun at(index: Int): OnboardingPage = entries[index.coerceIn(0, entries.lastIndex)]
    }
}
