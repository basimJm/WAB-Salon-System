package com.fab.wab.customer.core.data.mock

import com.fab.wab.customer.core.data.contract.generated.CustomerOperations
import com.fab.wab.customer.core.data.contract.generated.MockFixtures
import com.fab.wab.customer.core.data.contract.generated.Operation
import com.fab.wab.customer.core.domain.ErrorCode
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.respond
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.delay
import kotlinx.io.IOException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

private const val NAMESPACE_PREFIX = "/customer/v1"
private const val PATH_PARAM_PATTERN = "[^/]+"
private const val ARABIC = "ar"
private const val SAMPLE_TEXT_AR = "نص تجريبي"
private const val SAMPLE_TEXT_EN = "Sample text"
private const val OFFLINE_MESSAGE = "mock transport: offline scenario"
private const val TIMEOUT_EXTRA_MS = 1_000L
private const val TRACE_ID = "mock"
private const val SALONS_SEARCH_FIXTURE_KEY = "GetSalons"
private const val OPEN_NOW_PARAM = "openNow"
private const val OPEN_NOW_TRUE = "true"
private const val DATA_FIELD = "data"
private const val META_FIELD = "meta"
private const val TOTAL_FIELD = "total"
private const val IS_OPEN_NOW_FIELD = "isOpenNow"

/** `GET /customer/v1/salons/{salonId}` matches `/customer/v1/salons/s1`; the first contract operation wins. */
fun matchOperation(method: String, path: String, operations: List<Operation> = CustomerOperations.all): Operation? =
    operations.firstOrNull { op ->
        op.method.name.equals(method, ignoreCase = true) && templateRegex(op.path).matches(path)
    }

private fun templateRegex(template: String): Regex =
    Regex("^" + template.split("/").joinToString("/") { segment ->
        if (segment.startsWith("{")) PATH_PARAM_PATTERN else Regex.escape(segment)
    } + "$")

/** Replaces the text markers of a fixture with sample text in the request language (Accept-Language). */
fun localizeFixture(json: String, language: String?): String =
    json.replace(MockFixtures.TEXT_MARKER, if (language.orEmpty().startsWith(ARABIC)) SAMPLE_TEXT_AR else SAMPLE_TEXT_EN)

/** Operation id exactly as `api_sync.py` keys the fixture table: `GET /customer/v1/salons/{salonId}` → `GetSalonsBySalonId`. */
fun fixtureKeyOf(operation: Operation): String {
    val rest = operation.path.removePrefix(NAMESPACE_PREFIX).trim('/')
    val segments = rest.split("/").filter { it.isNotEmpty() }.joinToString("") { segment ->
        if (segment.startsWith("{")) "By" + pascal(segment.drop(1).dropLast(1)) else pascal(segment)
    }
    return operation.method.name.lowercase().replaceFirstChar { it.uppercase() } + segments
}

private fun pascal(segment: String): String =
    segment.split('-', '_').filter { it.isNotEmpty() }.joinToString("") { it.replaceFirstChar { c -> c.uppercase() } }

/** Backend error envelope; the message is the code itself (clients branch on `code`, never on server text). */
fun errorEnvelope(code: ErrorCode, path: String? = null): String {
    val details = path?.let { ""","details":{"path":"$it"}""" }.orEmpty()
    return """{"success":false,"message":"${code.name}","error":{"code":"${code.name}"$details,"traceId":"$TRACE_ID"}}"""
}

private fun emptyData(fixture: String): String =
    fixture.replace(Regex("\"data\":\\s*\\[.*]\\s*}$"), "\"data\": []}").replace(Regex("\"data\":\\s*\\{.*}\\s*}$"), "\"data\": null}")

/**
 * `GET /salons` with `openNow=true`: the mock keeps only businesses with `isOpenNow = true`, like the server
 * (CUS-110, BUSINESS_DOMAIN §5.17), so dev debug behaves like prod instead of serving every fixture row.
 */
private fun filterOpenNow(fixture: String): String {
    val root = Json.parseToJsonElement(fixture).jsonObject
    val data = root[DATA_FIELD]?.jsonArray ?: return fixture
    val open = JsonArray(data.filter { it.jsonObject[IS_OPEN_NOW_FIELD]?.jsonPrimitive?.booleanOrNull == true })
    val updates = buildMap {
        put(DATA_FIELD, open)
        root[META_FIELD]?.jsonObject?.let { put(META_FIELD, JsonObject(it + (TOTAL_FIELD to JsonPrimitive(open.size)))) }
    }
    return JsonObject(root + updates).toString()
}

/**
 * Ktor engine that answers from the generated fixtures according to [MockScenarios]; unknown paths answer 404 with the
 * backend envelope so a screen hitting a non-contract path fails visibly.
 */
fun createMockEngine(requestTimeoutMs: Long, scenarios: MockScenarios = MockScenarios): HttpClientEngine = MockEngine { request ->
    val language = request.headers[HttpHeaders.AcceptLanguage]
    val json = headersOf(HttpHeaders.ContentType, "application/json")
    when (scenarios.current.value) {
        MockScenario.Offline -> throw IOException(OFFLINE_MESSAGE)
        MockScenario.Timeout -> {
            delay(requestTimeoutMs + TIMEOUT_EXTRA_MS)
            respond(errorEnvelope(ErrorCode.INTERNAL), HttpStatusCode.GatewayTimeout, json)
        }
        MockScenario.Unauthorized -> respond(errorEnvelope(ErrorCode.UNAUTHORIZED), HttpStatusCode.Unauthorized, json)
        MockScenario.NotFound -> respond(errorEnvelope(ErrorCode.NOT_FOUND), HttpStatusCode.NotFound, json)
        MockScenario.ServerError -> respond(errorEnvelope(ErrorCode.INTERNAL), HttpStatusCode.InternalServerError, json)
        MockScenario.Success, MockScenario.Empty -> {
            val operation = matchOperation(request.method.value, request.url.encodedPath)
            val operationKey = operation?.let { fixtureKeyOf(it) }
            val fixture = operationKey?.let { MockFixtures.byOperationId[it] }
            if (fixture == null) {
                respond(errorEnvelope(ErrorCode.NOT_FOUND, request.url.encodedPath), HttpStatusCode.NotFound, json)
            } else {
                var body = if (scenarios.current.value == MockScenario.Empty) emptyData(fixture) else fixture
                if (operationKey == SALONS_SEARCH_FIXTURE_KEY && request.url.parameters[OPEN_NOW_PARAM] == OPEN_NOW_TRUE) {
                    body = filterOpenNow(body)
                }
                respond(localizeFixture(body, language), HttpStatusCode.OK, json)
            }
        }
    }
}
