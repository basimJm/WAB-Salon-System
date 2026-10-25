package com.fab.wab.merchant.core.data.places

import com.fab.wab.merchant.core.data.places.dto.PlaceDetailsResponse
import com.fab.wab.merchant.core.data.places.dto.PlacesAutocompleteResponse
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.http.URLBuilder
import io.ktor.http.URLProtocol

/**
 * Service for calling Google Places API via HTTP.
 * Works on both Android and iOS from commonMain.
 */
class PlacesApiService(
    private val client: HttpClient,
    private val apiKey: String
) {
    companion object {
        /** Google Places web service (fixed for every environment; the key comes from `PlacesApiConfig`). */
        private const val PLACES_HOST = "maps.googleapis.com"
        private val PLACES_PATH = listOf("maps", "api", "place")
        private const val AUTOCOMPLETE = "autocomplete"
        private const val DETAILS = "details"
        private const val JSON = "json"
    }

    /**
     * Search for places using autocomplete predictions.
     *
     * @param query The search query string
     * @return List of place predictions
     */
    suspend fun searchPlaces(query: String): PlacesAutocompleteResponse {
        return client.get(placesUrl(AUTOCOMPLETE)) {
            parameter("input", query)
            parameter("key", apiKey)
            // Optional: restrict to Jordan region
            parameter("components", "country:jo")
        }.body()
    }

    /**
     * Fetch detailed place information including coordinates.
     *
     * @param placeId The place ID from autocomplete
     * @return Place details with lat/lng
     */
    suspend fun getPlaceDetails(placeId: String): PlaceDetailsResponse {
        return client.get(placesUrl(DETAILS)) {
            parameter("place_id", placeId)
            parameter("key", apiKey)
            parameter("fields", "place_id,name,formatted_address,geometry")
        }.body()
    }

    private fun placesUrl(endpoint: String): String = URLBuilder(
        protocol = URLProtocol.HTTPS,
        host = PLACES_HOST,
        pathSegments = PLACES_PATH + listOf(endpoint, JSON),
    ).buildString()
}
