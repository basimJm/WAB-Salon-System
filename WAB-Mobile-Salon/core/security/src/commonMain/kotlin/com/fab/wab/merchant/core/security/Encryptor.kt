package com.fab.wab.merchant.core.security

expect class Encryptor(
    algorithm: Algorithm,
    passPhrase: String,
    salt: String,
    transformation: String,
) {
    fun encrypt(message: String): String
    fun decrypt(message: String): String
}
