plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.onboarding.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.onboarding.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.customer.feature.onboarding.presentation.resources"
}
