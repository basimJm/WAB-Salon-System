package com.fab.wab.customer.core.analytics

/** A parameter value the vendor backends can carry (Firebase accepts strings, longs and doubles). */
sealed interface AnalyticsValue {
    data class Text(val value: String) : AnalyticsValue
    data class Number(val value: Long) : AnalyticsValue
    data class Decimal(val value: Double) : AnalyticsValue
    data class Flag(val value: Boolean) : AnalyticsValue
}

typealias AnalyticsParams = Map<String, AnalyticsValue>

/** A screen view (PRD §14: every screen). `name` is the stable analytics id of the screen, e.g. `salon_details`. */
data class AnalyticsScreen(
    val name: String,
    val params: AnalyticsParams = emptyMap(),
)

/** A user action (PRD §14: every action), e.g. `favorite_add` with `salon_id`. */
data class AnalyticsAction(
    val name: String,
    val params: AnalyticsParams = emptyMap(),
)

/** The vendor-neutral event handed to an [AnalyticsBackend] after validation and context enrichment. */
data class AnalyticsEvent(
    val name: String,
    val params: AnalyticsParams = emptyMap(),
)

/** Parameter keys shared by every event (PRD §14 common fields and ids). */
object AnalyticsKeys {
    const val SCREEN_NAME = "screen_name"
    const val USER_TYPE = "user_type"
    const val GENDER_SCOPE = "gender_scope"
    const val LANGUAGE = "language"
    const val APP_VERSION = "app_version"
    const val PLATFORM = "platform"
    const val ENVIRONMENT = "environment"
    const val SALON_ID = "salon_id"
    const val SERVICE_ID = "service_id"
    const val STAFF_ID = "staff_id"
    const val BOOKING_ID = "booking_id"
}

/** Event names owned by the analytics module itself; feature modules declare their own next to their screens. */
object AnalyticsEventNames {
    const val SCREEN_VIEW = "screen_view"
}

/** Builder helpers so call sites stay readable: `params { text(SALON_ID, id); number(COUNT, 3) }`. */
class AnalyticsParamsBuilder internal constructor() {
    private val values = LinkedHashMap<String, AnalyticsValue>()

    fun text(key: String, value: String) = apply { values[key] = AnalyticsValue.Text(value) }
    fun number(key: String, value: Long) = apply { values[key] = AnalyticsValue.Number(value) }
    fun decimal(key: String, value: Double) = apply { values[key] = AnalyticsValue.Decimal(value) }
    fun flag(key: String, value: Boolean) = apply { values[key] = AnalyticsValue.Flag(value) }

    internal fun build(): AnalyticsParams = values.toMap()
}

fun analyticsParams(block: AnalyticsParamsBuilder.() -> Unit): AnalyticsParams =
    AnalyticsParamsBuilder().apply(block).build()
