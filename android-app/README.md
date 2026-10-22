# BunkPulse Native Android Application

Native Android application built with **Kotlin 2.0+**, **Jetpack Compose (Material 3)**, **Hilt**, **Room**, **Retrofit**, and **WorkManager**, consuming the BunkPulse Next.js + MongoDB API.

## Architecture Highlights
- **Clean Architecture + MVVM (MVI-style UDF)**: Pure Kotlin domain layer with 100% calculation parity with the web application (`AttendanceCalculator`).
- **Dynamic Base URL Switching**: Switch between Android Emulator (`http://10.0.2.2:3000/api`), Localhost, or Custom Central Production Server from the UI with live connection ping and latency telemetry.
- **Strict Multi-Tenant Isolation**: Client requests are strictly scoped to the authenticated user's `userId`.
- **Offline-First Persistence**: Instant cold start using Room Database cache with optimistic UI mutations and WorkManager sync.
- **Smart Reminders**: Local notification reminders at 8:30 PM before the server's 11:30 PM auto-absent cron sweep.

## How to Run in Android Studio
1. Open **Android Studio** (Koala / Ladybug or newer recommended).
2. Choose **Open Project** and select this directory (`attendance-tracker/android-app`).
3. Allow Gradle to sync dependencies and download the Android SDK (Android 15 / API 35).
4. Run on an Android Emulator or connected physical device.
5. In the app's top bar or settings, set the Server URL to your local server or production URL.

## Default Connection Presets
- **Android Emulator**: `http://10.0.2.2:3000/api`
- **Physical Device on Same Wi-Fi**: `http://<YOUR_COMPUTER_LOCAL_IP>:3000/api`
- **Deployed Production**: `https://<YOUR_DEPLOYED_DOMAIN>/api`
