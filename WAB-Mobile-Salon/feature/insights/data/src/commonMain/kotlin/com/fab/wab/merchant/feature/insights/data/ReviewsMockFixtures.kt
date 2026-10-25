package com.fab.wab.merchant.feature.insights.data

import com.fab.wab.merchant.core.data.contract.generated.MerchantOperations
import com.fab.wab.merchant.core.data.mock.MockFixture

/** Koin name of the mock reviews (dev builds with `DATA_SOURCE=mock`). */
const val MOCK_REVIEWS_FIXTURE = "mockReviews"

private fun review(id: String, rating: String, staff: String?, date: String) =
    """{"id":"$id","customerName":"__TEXT__","rating":$rating,"comment":"__TEXT__","createdAt":"$date",""" +
        """"branch":{"id":"b-main","name":"__TEXT__"},"staff":${staff ?: "null"}}"""

private const val SARA = """{"id":"s1","firstName":"Sara"}"""
private const val LINA = """{"id":"s2","firstName":"Lina"}"""

/** A salon with a realistic spread of stars and two staff members, so both tabs and the selector have data. */
private val REVIEWS_JSON =
    """{"success":true,"message":"","data":{"items":[""" +
        review("r1", "5", SARA, "2026-10-24T18:20:00Z") + "," +
        review("r2", "4", LINA, "2026-10-22T11:05:00Z") + "," +
        review("r3", "5", null, "2026-10-20T09:40:00Z") + "," +
        review("r4", "3", SARA, "2026-10-15T16:00:00Z") + "]," +
        """"summary":{"avg":4.6,"count":126,"distribution":{"1":2,"2":3,"3":8,"4":25,"5":88}}},""" +
        """"meta":{"page":1,"pageSize":20,"total":4}}"""

val mockReviewsFixture = MockFixture(MerchantOperations.getReviews.method.name, MerchantOperations.getReviews.path, REVIEWS_JSON)
