import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    `kotlin-dsl`
}

group = "com.fab.wab.customer.buildlogic"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_21
    }
}

dependencies {
    compileOnly(libs.android.gradlePlugin)
    compileOnly(libs.android.gradlePluginApi)
    compileOnly(libs.kotlin.gradlePlugin)
    compileOnly(libs.compose.gradlePlugin)
    compileOnly(libs.compose.compiler.gradlePlugin)
}

gradlePlugin {
    plugins {
        register("kotlinMultiplatformLibrary") {
            id = "com.fab.wab.customer.kotlin.multiplatform.library"
            implementationClass = "com.fab.wab.customer.buildlogic.KotlinMultiplatformLibraryPlugin"
        }
        register("composeApp") {
            id = "com.fab.wab.customer.compose.app"
            implementationClass = "com.fab.wab.customer.buildlogic.ComposeAppPlugin"
        }
        register("androidApp") {
            id = "com.fab.wab.customer.android.app"
            implementationClass = "com.fab.wab.customer.buildlogic.AndroidAppPlugin"
        }
        register("coreLibrary") {
            id = "com.fab.wab.customer.core.library"
            implementationClass = "com.fab.wab.customer.buildlogic.KmpCoreLibraryPlugin"
        }
        register("coreCompose") {
            id = "com.fab.wab.customer.core.compose"
            implementationClass = "com.fab.wab.customer.buildlogic.KmpCoreComposePlugin"
        }
        register("featureDomain") {
            id = "com.fab.wab.customer.feature.domain"
            implementationClass = "com.fab.wab.customer.buildlogic.KmpFeatureDomainPlugin"
        }
        register("featureData") {
            id = "com.fab.wab.customer.feature.data"
            implementationClass = "com.fab.wab.customer.buildlogic.KmpFeatureDataPlugin"
        }
        register("featurePresentation") {
            id = "com.fab.wab.customer.feature.presentation"
            implementationClass = "com.fab.wab.customer.buildlogic.KmpFeaturePresentationPlugin"
        }
        register("featureDi") {
            id = "com.fab.wab.customer.feature.di"
            implementationClass = "com.fab.wab.customer.buildlogic.KmpFeatureDiPlugin"
        }
    }
}
