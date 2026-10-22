plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.salon.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.salon.domain)
        implementation(projects.feature.home.domain)
        implementation(projects.feature.home.presentation)
        implementation(libs.kotlinx.datetime) // S07 hours card: today's day in Asia/Amman
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.customer.feature.salon.presentation.resources"
}
