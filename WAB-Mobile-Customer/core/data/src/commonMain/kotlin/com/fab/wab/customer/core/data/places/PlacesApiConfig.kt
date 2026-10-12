package com.fab.wab.customer.core.data.places

/**
 * Configuration for Google Places API.
 * API key is provided via platform-specific implementations.
 */
expect object PlacesApiConfig {
    val apiKey: String
}