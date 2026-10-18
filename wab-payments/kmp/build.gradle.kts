plugins {
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.androidKmpLibrary) apply false
    alias(libs.plugins.androidLibrary) apply false
}

allprojects {
    group = providers.gradleProperty("wab.payments.group").get()
    version = providers.gradleProperty("wab.payments.version").get()
}
