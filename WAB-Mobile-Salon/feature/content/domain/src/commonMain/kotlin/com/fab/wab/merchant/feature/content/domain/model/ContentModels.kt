package com.fab.wab.merchant.feature.content.domain.model

/** `GET /content/pages/{slug}` (PRD S23): kind PRIVACY | TERMS | ABOUT, body = sanitized HTML subset. */
data class ContentPage(val kind: String, val body: String)

data class FaqItem(val id: String, val question: String, val answer: String)

/** Slugs the app links to (S11/S12 legal links, S21 legal rows); `contact` is rendered from the app config, not a page. */
object ContentSlugs {
    const val PRIVACY = "privacy"
    const val TERMS = "terms"
    const val ABOUT = "about"
    const val CONTACT = "contact"
}
