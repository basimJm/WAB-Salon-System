plugins {
    alias(libs.plugins.com.fab.wab.customer.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.customer.feature.salons.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.salons.domain)
        implementation(projects.feature.home.domain)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.customer.feature.salons.presentation.resources"
}
