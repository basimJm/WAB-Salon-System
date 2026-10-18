plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.auth.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.auth.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.customer.feature.auth.presentation.resources"
}
