# R8 rules for the release variants of the app (see CLAUDE.md §5). Library rules ship with their AARs;
# shared data/serialization rules live in ../data-proguard-rules.pro.

# Keep line numbers so release crash reports stay readable.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Optional logging backends that Ktor references but the app does not ship.
-dontwarn org.slf4j.**
-dontwarn java.lang.management.**
-dontwarn javax.naming.**
