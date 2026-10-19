package com.wab.payments

internal fun session(
    provider: String = "hyperpay",
    sessionId: String = "chk-1",
    checkoutId: String = "chk-1",
    brands: List<String> = listOf("VISA", "MASTER"),
    shopperResultUrl: String = "wab://payment/result",
    amountFils: Long = 12_500,
    checkoutUrl: String? = null,
): CheckoutSession =
    CheckoutSession(
        provider = provider,
        environment = PaymentEnvironment.DEV,
        sessionId = sessionId,
        checkoutId = checkoutId,
        brands = brands,
        shopperResultUrl = shopperResultUrl,
        amountFils = amountFils,
        checkoutUrl = checkoutUrl,
    )
