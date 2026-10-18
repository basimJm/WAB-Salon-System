plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.home.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.home.domain)
        implementation(projects.core.realtime)
        implementation(libs.kotlinx.serialization.json)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.customer.feature.home.presentation.resources"
}
