package com.fab.wab.merchant.core.data.places

import com.fab.wab.merchant.core.data.places.dto.PlaceDetailsResponse
import com.fab.wab.merchant.core.data.places.dto.PlacesAutocompleteResponse
import com.fab.wab.merchant.core.domain.model.PlacePrediction
import com.fab.wab.merchant.core.domain.repository.PlacesRepository
import io.ktor.client.plugins.ResponseException
import kotlinx.io.IOException
import kotlinx.serialization.SerializationException

/**
 * Implementation of PlacesRepository using Google Places REST API.
 * Works on both Android and iOS from commonMain.
 */
class PlacesRepositoryImpl(
    private val placesApiService: PlacesApiService
) : PlacesRepository {

    override suspend fun searchPlaces(query: String): List<PlacePrediction> {
        if (query.isBlank()) return emptyList()

        return safely(emptyList()) {
            val response: PlacesAutocompleteResponse = placesApiService.searchPlaces(query)

            if (response.status == "OK" || response.status == "ZERO_RESULTS") {
                response.predictions.map { prediction ->
                    PlacePrediction(
                        placeId = prediction.placeId,
                        primaryText = prediction.structuredFormatting?.mainText ?: prediction.description,
                        secondaryText = prediction.structuredFormatting?.secondaryText ?: "",
                        lat = null,
                        lng = null
                    )
                }
            } else {
                emptyList()
            }
        }
    }

    override suspend fun fetchPlaceDetails(placeId: String): PlacePrediction? {
        if (placeId.isBlank()) return null

        return safely(null) {
            val response: PlaceDetailsResponse = placesApiService.getPlaceDetails(placeId)

            if (response.status == "OK" && response.result != null) {
                PlacePrediction(
                    placeId = response.result.placeId,
                    primaryText = response.result.name,
                    secondaryText = response.result.formattedAddress,
                    lat = response.result.geometry?.location?.lat,
                    lng = response.result.geometry?.location?.lng
                )
            } else {
                null
            }
        }
    }

    /** Places is optional UI help: a network, HTTP or parsing failure falls back to [fallback]. */
    private suspend fun <T> safely(fallback: T, block: suspend () -> T): T = try {
        block()
    } catch (ignored: IOException) {
        fallback
    } catch (ignored: ResponseException) {
        fallback
    } catch (ignored: SerializationException) {
        fallback
    }
}
