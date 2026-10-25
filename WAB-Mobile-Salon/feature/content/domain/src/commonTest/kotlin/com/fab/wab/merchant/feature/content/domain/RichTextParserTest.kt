package com.fab.wab.merchant.feature.content.domain

import com.fab.wab.merchant.feature.content.domain.model.RichBlock
import com.fab.wab.merchant.feature.content.domain.model.RichSpan
import com.fab.wab.merchant.feature.content.domain.model.RichTextParser
import kotlin.test.Test
import kotlin.test.assertEquals

class RichTextParserTest {

    @Test
    fun parsesHeadingsParagraphsListsAndInlineStyles() {
        val html = "<h2>Privacy</h2><p>We keep <strong>your</strong> data <em>safe</em>.<br>Really.</p>" +
            "<ul><li>One</li><li><a href=\"https://x.y\">Two</a></li></ul>"
        val blocks = RichTextParser.parse(html)
        assertEquals(
            listOf(
                RichBlock.Heading(2, listOf(RichSpan("Privacy"))),
                RichBlock.Paragraph(
                    listOf(
                        RichSpan("We keep "),
                        RichSpan("your", bold = true),
                        RichSpan(" data "),
                        RichSpan("safe", italic = true),
                        RichSpan("."),
                        RichSpan("\n"),
                        RichSpan("Really."),
                    ),
                ),
                RichBlock.Bullet(listOf(RichSpan("One"))),
                RichBlock.Bullet(listOf(RichSpan("Two", link = "https://x.y"))),
            ),
            blocks,
        )
    }

    @Test
    fun dropsUnknownTagsDecodesEntitiesAndCollapsesWhitespace() {
        val blocks = RichTextParser.parse("<script>alert(1)</script>Tom &amp; Jerry\n\n  &lt;3 &#169;<h5>deep</h5>")
        assertEquals(
            listOf(RichBlock.Paragraph(listOf(RichSpan("alert(1)Tom & Jerry <3 ©"))), RichBlock.Heading(3, listOf(RichSpan("deep")))),
            blocks,
        )
        assertEquals(emptyList(), RichTextParser.parse("  <p> </p> "))
    }
}
