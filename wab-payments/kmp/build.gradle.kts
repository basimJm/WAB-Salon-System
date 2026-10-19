plugins {
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.androidKmpLibrary) apply false
    alias(libs.plugins.androidLibrary) apply false
}

allprojects {
    group = providers.gradleProperty("wab.payments.group").get()
    version = providers.gradleProperty("wab.payments.version").get()
}

// Private Maven publication (GitHub Packages assumed). Nothing is published unless the owner runs
// `./gradlew publish` with the URL and credentials (see PUBLISHING.md); `publishToMavenLocal` always works.
subprojects {
    pluginManager.withPlugin("maven-publish") {
        extensions.configure<PublishingExtension> {
            publications.withType<MavenPublication>().configureEach {
                pom {
                    name.set("WAB payments (${project.name})")
                    description.set("Gateway-independent payment launcher ports and HyperPay bridges for WAB apps.")
                    url.set(providers.gradleProperty("wab.payments.scm.url"))
                    scm {
                        connection.set(providers.gradleProperty("wab.payments.scm.connection"))
                        url.set(providers.gradleProperty("wab.payments.scm.url"))
                    }
                }
            }
            val repositoryUrl = providers.gradleProperty("wab.payments.maven.url").orNull.orEmpty()
            if (repositoryUrl.isNotBlank()) {
                repositories {
                    maven {
                        name = "wabPackages"
                        setUrl(repositoryUrl)
                        credentials {
                            username = providers.environmentVariable("WAB_MAVEN_USER").orNull
                            password = providers.environmentVariable("WAB_MAVEN_TOKEN").orNull
                        }
                    }
                }
            }
        }
    }
}
