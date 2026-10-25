plugins {
    alias(libs.plugins.com.fab.wab.merchant.feature.presentation)
}

// Branch data and the shared switcher state live in core (every scoped feature reads them), so this feature has
// only a presentation module (MER-062).
kotlin {
    android {
        namespace = "com.fab.wab.merchant.feature.branches.presentation"
        compileSdk = 36
        minSdk = 26
        androidResources { enable = true }
    }
    sourceSets.commonMain.dependencies {
        implementation(projects.core.designSystem)
        implementation(projects.core.ui)
    }
    sourceSets.commonTest.dependencies {
        implementation(libs.kotlinx.coroutines.test)
    }
}

// Pinned so the generated resource package follows the app package rather than
// rootProject.name, which would otherwise change when the project is renamed.
compose.resources {
    publicResClass = true
    packageOfResClass = "com.fab.wab.merchant.feature.branches.presentation.resources"
}
