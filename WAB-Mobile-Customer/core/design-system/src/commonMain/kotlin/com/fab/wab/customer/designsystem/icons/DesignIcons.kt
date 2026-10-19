package com.fab.wab.customer.designsystem.icons

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.dp
import com.fab.wab.customer.designsystem.theme.LightColors

/** The design's own 24-unit line icons (`IC` maps and inline SVGs of `design/WAB 0x *.dc.html`), rebuilt as vectors. */
@Suppress("LargeClass", "TooManyFunctions") // one val per design icon, generated from the SVG paths
internal object DesignIcons {
    val Back: ImageVector by lazy { icon("Back", STROKE_BOLD, true, "M15 5l-7 7 7 7") }
    val Forward: ImageVector by lazy { icon("Forward", STROKE_BOLD, true, "M9 5l7 7-7 7") }
    val Check: ImageVector by lazy { icon("Check", STROKE_CHECK, false, "M5 12.5l4.5 4.5L19 7.5") }
    val Search: ImageVector by lazy { icon("Search", STROKE_BOLD, false, "M4.5 11a6.5 6.5 0 1 0 13.0 0a6.5 6.5 0 1 0 -13.0 0z", "M20 20l-4.5-4.5") }
    val Filter: ImageVector by lazy { icon("Filter", STROKE_BOLD, false, "M4 7h10M18 7h2M4 17h4M12 17h8", "M14 7a2 2 0 1 0 4 0a2 2 0 1 0 -4 0z", "M8 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0z") }
    val Home: ImageVector by lazy { icon("Home", STROKE, false, "M4 11.5 12 4l8 7.5M6 10v9.5h12V10") }
    val FavoriteBorder: ImageVector by lazy { icon("FavoriteBorder", STROKE_BOLD, false, "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z") }
    val Favorite: ImageVector by lazy { icon("Favorite", null, false, "M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z") }
    val Bookings: ImageVector by lazy { icon("Bookings", STROKE, false, "M5 6h14v14H5zM5 10.5h14M9 3.5v4M15 3.5v4") }
    val Profile: ImageVector by lazy { icon("Profile", STROKE, false, "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5a7.5 7.5 0 0 1 15 0") }
    val Notifications: ImageVector by lazy { icon("Notifications", STROKE, false, "M12 3a5.5 5.5 0 0 0-5.5 5.5c0 3.6-1.1 5-2 6.5h15c-.9-1.5-2-2.9-2-6.5A5.5 5.5 0 0 0 12 3zM9.5 19a2.5 2.5 0 0 0 5 0") }
    val Star: ImageVector by lazy { icon("Star", null, false, "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z") }
    val StarBorder: ImageVector by lazy { icon("StarBorder", STROKE, false, "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z") }
    val Call: ImageVector by lazy { icon("Call", STROKE, false, "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z") }
    val Share: ImageVector by lazy { icon("Share", STROKE, false, "M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V20h14v-7.5") }
    val Info: ImageVector by lazy { icon("Info", STROKE_BOLD, false, "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0z", "M12 11v5M12 8h.01") }
    val Error: ImageVector by lazy { icon("Error", STROKE_THIN, false, "M12 8v5M12 16.5h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z") }
    val Offline: ImageVector by lazy { icon("Offline", STROKE_THIN, false, "M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M19 13a10 10 0 0 0-3-2M2 9.5a15 15 0 0 1 4.5-2.8M22 9.5A15 15 0 0 0 11 5.1M12 20h.01") }
    val ExpandMore: ImageVector by lazy { icon("ExpandMore", STROKE_CHEVRON, false, "M6 9l6 6 6-6") }
    val ExpandLess: ImageVector by lazy { icon("ExpandLess", STROKE_CHEVRON, false, "M6 15l6-6 6 6") }
    val Play: ImageVector by lazy { icon("Play", null, false, "M8 5v14l11-7z") }
    val Pause: ImageVector by lazy { icon("Pause", null, false, "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z") }
    val Chat: ImageVector by lazy { icon("Chat", STROKE, false, "M4 20l1.3-4A8 8 0 1 1 8 18.7z", "M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 1.8.8c-.3 1.2-1.3 1.9-2.5 1.7C10.6 15 8.9 13.3 8.4 10.2 8.2 9 9 8 10.2 7.7l.8 1.8z") }
    val Location: ImageVector by lazy { icon("Location", STROKE_BOLD, false, "M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z", "M9.7 9a2.3 2.3 0 1 0 4.6 0a2.3 2.3 0 1 0 -4.6 0z") }
    val LocationOff: ImageVector by lazy { icon("LocationOff", STROKE_BOLD, false, "M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z", "M3 3l18 18") }
    val Image: ImageVector by lazy { icon("Image", STROKE, false, "M4 5h16v14H4zM4 15l4.5-4.5L13 15l3-3 4 4M15.5 9.5h.01") }
    val Gallery: ImageVector by lazy { icon("Gallery", STROKE, false, "M4 5h16v14H4zM4 15l4.5-4.5L13 15l3-3 4 4M15.5 9.5h.01") }
    val Edit: ImageVector by lazy { icon("Edit", STROKE_PENCIL, false, "M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17l3 3 5.2-5.2a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.6-.4-.4-2.6z") }
    val Delete: ImageVector by lazy { icon("Delete", STROKE, false, "M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13") }
    val Email: ImageVector by lazy { icon("Email", STROKE, false, "M4 6h16v12H4zM4 7l8 6 8-6") }
    val Camera: ImageVector by lazy { icon("Camera", STROKE, false, "M4 8h3l2-2.5h6L17 8h3v11H4zM12 16.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z") }
    val Help: ImageVector by lazy { icon("Help", STROKE, false, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 16.5h.01") }
    val Legal: ImageVector by lazy { icon("Legal", STROKE, false, "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5") }
    val Shield: ImageVector by lazy { icon("Shield", STROKE, false, "M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z") }
    val Business: ImageVector by lazy { icon("Business", STROKE, false, "M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6") }
    val Language: ImageVector by lazy { icon("Language", STROKE, false, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z") }
    val ThemeDark: ImageVector by lazy { icon("ThemeDark", STROKE, false, "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z") }
    val ThemeLight: ImageVector by lazy { icon("ThemeLight", STROKE, false, "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4") }
    val Device: ImageVector by lazy { icon("Device", STROKE_LIGHT, false, "M9 2.5h6a3 3 0 0 1 3 3v13a3 3 0 0 1 -3 3h-6a3 3 0 0 1 -3 -3v-13a3 3 0 0 1 3 -3z", "M10.5 18.5h3") }
    val Tag: ImageVector by lazy { icon("Tag", STROKE, false, "M3.5 12.5 11.5 4.5H20v8.5l-8 8z M15.5 8.5h.01") }
    val NotificationsOff: ImageVector by lazy { icon("NotificationsOff", STROKE, false, "M12 3a5.5 5.5 0 0 0-5.5 5.5c0 3.6-1.1 5-2 6.5h15c-.9-1.5-2-2.9-2-6.5A5.5 5.5 0 0 0 12 3zM9.5 19a2.5 2.5 0 0 0 5 0M3 3l18 18") }
    val Clock: ImageVector by lazy { icon("Clock", STROKE_BOLD, false, "M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0z", "M12 7v5l3 2") }
    val Download: ImageVector by lazy { icon("Download", STROKE_PENCIL, false, "M12 3v12M7 10l5 5 5-5", "M5 20h14") }
    val Map: ImageVector by lazy { icon("Map", STROKE_BOLD, false, "M6.5 5.5h11.0a2.5 2.5 0 0 1 2.5 2.5v10.0a2.5 2.5 0 0 1 -2.5 2.5h-11.0a2.5 2.5 0 0 1 -2.5 -2.5v-10.0a2.5 2.5 0 0 1 2.5 -2.5z", "M4 10h16M9 14l6 4M15 14l-6 4") }
    val Lock: ImageVector by lazy { icon("Lock", STROKE, false, "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3") }
    val Bride: ImageVector by lazy { icon("Bride", STROKE_LIGHT, false, "M12 3l1.8 3.6L18 7.2l-3 2.9.7 4.1L12 12.3 8.3 14.2 9 10.1 6 7.2l4.2-.6z", "M7 21c1.5-3 3-4.5 5-4.5s3.5 1.5 5 4.5") }
    val Companions: ImageVector by lazy { icon("Companions", STROKE, false, "M5.8 9a3.2 3.2 0 1 0 6.4 0a3.2 3.2 0 1 0 -6.4 0z", "M13.9 10a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0z", "M3.5 19a5.5 5.5 0 0 1 11 0M14 19a4.5 4.5 0 0 1 7 0") }
    val Person: ImageVector by lazy { icon("Person", STROKE, false, "M8 8a4 4 0 1 0 8 0a4 4 0 1 0 -8 0z", "M4.5 20.5a7.5 7.5 0 0 1 15 0") }
    val AddPerson: ImageVector by lazy { icon("AddPerson", STROKE, false, "M5.5 8a3.5 3.5 0 1 0 7.0 0a3.5 3.5 0 1 0 -7.0 0z", "M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6") }
    val Avatar: ImageVector by lazy { icon("Avatar", null, false, "M8 9a4 4 0 1 0 8 0a4 4 0 1 0 -8 0z", "M4 22a8 8 0 0 1 16 0z") }

    private fun icon(name: String, strokeWidth: Float?, mirrored: Boolean, vararg paths: String): ImageVector {
        val builder = ImageVector.Builder(name = name, defaultWidth = SIZE.dp, defaultHeight = SIZE.dp, viewportWidth = SIZE, viewportHeight = SIZE, autoMirror = mirrored)
        paths.forEach { data ->
            val nodes = PathParser().parsePathString(data).toNodes()
            if (strokeWidth == null) {
                builder.addPath(nodes, fill = SolidColor(TINT))
            } else {
                builder.addPath(nodes, stroke = SolidColor(TINT), strokeLineWidth = strokeWidth, strokeLineCap = StrokeCap.Round, strokeLineJoin = StrokeJoin.Round)
            }
        }
        return builder.build()
    }

    private const val SIZE = 24f
    /** Icons are tinted by `Icon`; the base colour never shows. */
    private val TINT = LightColors.ink
    private const val STROKE_THIN = 1.5f
    private const val STROKE_PENCIL = 1.6f
    private const val STROKE_LIGHT = 1.7f
    private const val STROKE = 1.8f
    private const val STROKE_BOLD = 2f
    private const val STROKE_CHEVRON = 2.2f
    private const val STROKE_CHECK = 2.4f
}
