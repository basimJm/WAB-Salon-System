plugins {
    alias(libs.plugins.androidLibrary)
    id("maven-publish")
}

// The HyperPay (OPP) mobile SDK is not on Maven Central: version and repository are owner inputs
// (gradle.properties / ORG_GRADLE_PROJECT_*). Without them this module cannot be built.
val oppwaVersion = providers.gradleProperty("wab.payments.oppwa.version").orNull.orEmpty()

android {
    namespace = "com.wab.payments.hyperpay"
    compileSdk = libs.versions.android.compileSdk.get().toInt()
    defaultConfig {
        minSdk = libs.versions.android.minSdk.get().toInt()
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    publishing {
        singleVariant("release") { withSourcesJar() }
    }
}

dependencies {
    api(project(":payments"))
    implementation(libs.androidx.activity)
    implementation(libs.androidx.core.ktx)
    if (oppwaVersion.isNotBlank()) {
        // `compileOnly` keeps the vendor SDK (and its licence) out of this artifact: the app depends on it too.
        compileOnly("com.oppwa.mobile:oppwa.mobile:$oppwaVersion")
    } else {
        logger.warn("wab.payments.oppwa.version is not set: payments-hyperpay-android will not compile.")
    }
}
