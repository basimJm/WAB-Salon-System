package com.fab.wab.customer.feature.content.domain.model

/** One inline run of a paragraph: text with its emphasis and an optional link target. */
data class RichSpan(val text: String, val bold: Boolean = false, val italic: Boolean = false, val link: String? = null)

/** Block-level content the renderer understands; anything else in the HTML is flattened into paragraphs. */
sealed interface RichBlock {
    data class Heading(val level: Int, val spans: List<RichSpan>) : RichBlock
    data class Paragraph(val spans: List<RichSpan>) : RichBlock
    data class Bullet(val spans: List<RichSpan>) : RichBlock
}

/**
 * Parses the server's sanitized HTML subset (PRD S23: rich text) into blocks: `p`, `br`, `h1`–`h3`, `ul`/`ol` + `li`,
 * `b`/`strong`, `i`/`em`, `a href`. Unknown tags are dropped, their text kept; entities are decoded. Pure and tested.
 */
object RichTextParser {
    private val TAG = Regex("<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>")
    private val HREF = Regex("href\\s*=\\s*[\"']([^\"']*)[\"']")
    private val ENTITIES = mapOf("&amp;" to "&", "&lt;" to "<", "&gt;" to ">", "&quot;" to "\"", "&#39;" to "'", "&apos;" to "'", "&nbsp;" to " ")
    private val NUMERIC_ENTITY = Regex("&#(\\d+);")
    private val WHITESPACE = Regex("\\s+")
    private const val MAX_HEADING = 3
    private const val GROUP_SLASH = 1
    private const val GROUP_NAME = 2
    private const val GROUP_ATTRIBUTES = 3

    fun parse(html: String): List<RichBlock> {
        val builder = Builder()
        var index = 0
        for (match in TAG.findAll(html)) {
            builder.text(html.substring(index, match.range.first))
            val closing = match.groupValues[GROUP_SLASH] == "/"
            val name = match.groupValues[GROUP_NAME].lowercase()
            if (closing) builder.close(name) else builder.open(name, match.groupValues[GROUP_ATTRIBUTES])
            index = match.range.last + 1
        }
        builder.text(html.substring(index))
        return builder.finish()
    }

    fun decode(text: String): String {
        var out = text
        ENTITIES.forEach { (entity, value) -> out = out.replace(entity, value) }
        return NUMERIC_ENTITY.replace(out) { m -> m.groupValues[1].toIntOrNull()?.toChar()?.toString() ?: m.value }
    }

    private class Builder {
        private val blocks = mutableListOf<RichBlock>()
        private val spans = mutableListOf<RichSpan>()
        private var bold = 0
        private var italic = 0
        private var link: String? = null
        private var block: ((List<RichSpan>) -> RichBlock)? = null

        fun text(raw: String) {
            val decoded = decode(raw).replace(WHITESPACE, " ")
            if (decoded.isBlank() && (spans.isEmpty() || spans.last().text.endsWith(" "))) return
            spans += RichSpan(decoded, bold > 0, italic > 0, link)
        }

        fun open(name: String, attributes: String) {
            when (name) {
                "b", "strong" -> bold++
                "i", "em" -> italic++
                "a" -> link = HREF.find(attributes)?.groupValues?.get(1)?.takeIf { it.isNotBlank() }
                "br" -> spans += RichSpan("\n", bold > 0, italic > 0, link)
                "p", "div" -> start { RichBlock.Paragraph(it) }
                "li" -> start { RichBlock.Bullet(it) }
                "h1", "h2", "h3", "h4", "h5", "h6" -> {
                    val level = name.drop(1).toInt().coerceAtMost(MAX_HEADING)
                    start { RichBlock.Heading(level, it) }
                }
                else -> Unit
            }
        }

        fun close(name: String) {
            when (name) {
                "b", "strong" -> bold = (bold - 1).coerceAtLeast(0)
                "i", "em" -> italic = (italic - 1).coerceAtLeast(0)
                "a" -> link = null
                "p", "div", "li", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol" -> flush()
                else -> Unit
            }
        }

        fun finish(): List<RichBlock> {
            flush()
            return blocks.toList()
        }

        private fun start(factory: (List<RichSpan>) -> RichBlock) {
            flush()
            block = factory
        }

        private fun flush() {
            val trimmed = trimmed(spans)
            if (trimmed.isNotEmpty()) blocks += (block ?: { RichBlock.Paragraph(it) })(trimmed)
            spans.clear()
            block = null
        }

        private fun trimmed(runs: List<RichSpan>): List<RichSpan> {
            if (runs.isEmpty()) return runs
            val out = runs.toMutableList()
            out[0] = out[0].copy(text = out[0].text.trimStart())
            out[out.lastIndex] = out[out.lastIndex].copy(text = out[out.lastIndex].text.trimEnd())
            return out.filter { it.text.isNotEmpty() }
        }
    }
}
