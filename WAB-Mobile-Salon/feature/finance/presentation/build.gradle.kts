plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.finance.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.finance.domain)
        implementation(projects.core.designSystem)
        implementation(projects.core.ui)
        implementation(libs.kotlinx.datetime)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

// Pinned so the generated resource package follows the app package rather than
// rootProject.name, which would otherwise change when the project is renamed.
compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.merchant.feature.finance.presentation.resources"
}
