plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.presentation)
}

kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.sample.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.feature.sample.domain)
        implementation(projects.core.designSystem)
    }
}

// Pinned so the generated resource package follows the app package rather than
// rootProject.name, which would otherwise change when the project is renamed.
compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.merchant.feature.sample.presentation.resources"
}
