# ProGuard rules for BunkPulse
-keepattributes *Annotation*
-dontwarn okhttp3.**
-dontwarn okio.**
-keepclassmembers class * {
    @androidx.room.TypeConverter *;
}
