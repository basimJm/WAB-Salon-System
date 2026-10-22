plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.content.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.content.domain)
        implementation(libs.kotlinx.datetime)
        implementation(libs.kotlinx.serialization.json)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.merchant.feature.content.presentation.resources"
}
