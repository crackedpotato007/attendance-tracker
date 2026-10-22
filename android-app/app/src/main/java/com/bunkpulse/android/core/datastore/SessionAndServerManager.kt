package com.bunkpulse.android.core.datastore

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.bunkpulse.android.domain.model.CampusGeofence
import com.bunkpulse.android.domain.model.User
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore by preferencesDataStore(name = "bunkpulse_prefs")

@Singleton
class SessionAndServerManager @Inject constructor(
    @ApplicationContext private val context: Context
) {
    companion object {
        const val DEFAULT_BASE_URL = "https://attendance.310706.xyz/api"
        val KEY_BASE_URL = stringPreferencesKey("server_base_url")
        val KEY_AUTH_TOKEN = stringPreferencesKey("auth_token")
        val KEY_USER_ID = stringPreferencesKey("user_id")
        val KEY_USER_NAME = stringPreferencesKey("user_name")
        val KEY_USER_EMAIL = stringPreferencesKey("user_email")
        val KEY_TARGET_ATTENDANCE = intPreferencesKey("user_target_attendance")

        // Campus Geofence preferences
        val KEY_CAMPUS_NAME = stringPreferencesKey("campus_name")
        val KEY_CAMPUS_LAT = doublePreferencesKey("campus_lat")
        val KEY_CAMPUS_LNG = doublePreferencesKey("campus_lng")
        val KEY_CAMPUS_RADIUS = intPreferencesKey("campus_radius")
        val KEY_CAMPUS_ENABLED = booleanPreferencesKey("campus_geofence_enabled")
    }

    // Dynamic Server Base URL Flow
    val baseUrlFlow: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[KEY_BASE_URL] ?: DEFAULT_BASE_URL
    }

    suspend fun getBaseUrl(): String {
        return baseUrlFlow.first()
    }

    suspend fun setBaseUrl(url: String) {
        val cleanUrl = url.trim().trimEnd('/')
        val formatted = if (cleanUrl.endsWith("/api")) cleanUrl else "$cleanUrl/api"
        context.dataStore.edit { prefs ->
            prefs[KEY_BASE_URL] = formatted
        }
    }

    // Auth Token Flow
    val authTokenFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_AUTH_TOKEN]
    }

    suspend fun getAuthToken(): String? {
        return authTokenFlow.first()
    }

    suspend fun saveAuthToken(token: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_AUTH_TOKEN] = token
        }
    }

    // Current User Session Flow
    val currentUserFlow: Flow<User?> = context.dataStore.data.map { prefs ->
        val id = prefs[KEY_USER_ID]
        val email = prefs[KEY_USER_EMAIL]
        val name = prefs[KEY_USER_NAME]
        val target = prefs[KEY_TARGET_ATTENDANCE] ?: 75
        if (id != null && email != null && name != null) {
            User(id = id, email = email, name = name, targetAttendance = target)
        } else {
            null
        }
    }

    suspend fun saveUser(user: User) {
        context.dataStore.edit { prefs ->
            prefs[KEY_USER_ID] = user.id
            prefs[KEY_USER_EMAIL] = user.email
            prefs[KEY_USER_NAME] = user.name
            prefs[KEY_TARGET_ATTENDANCE] = user.targetAttendance
        }
    }

    suspend fun clearSession() {
        context.dataStore.edit { prefs ->
            prefs.remove(KEY_AUTH_TOKEN)
            prefs.remove(KEY_USER_ID)
            prefs.remove(KEY_USER_NAME)
            prefs.remove(KEY_USER_EMAIL)
            prefs.remove(KEY_TARGET_ATTENDANCE)
        }
    }

    // Campus Geofence Flow
    val campusGeofenceFlow: Flow<CampusGeofence> = context.dataStore.data.map { prefs ->
        CampusGeofence(
            name = prefs[KEY_CAMPUS_NAME] ?: "College Campus",
            latitude = prefs[KEY_CAMPUS_LAT] ?: 0.0,
            longitude = prefs[KEY_CAMPUS_LNG] ?: 0.0,
            radiusMeters = prefs[KEY_CAMPUS_RADIUS] ?: 250,
            isEnabled = prefs[KEY_CAMPUS_ENABLED] ?: false
        )
    }

    suspend fun getCampusGeofence(): CampusGeofence {
        return campusGeofenceFlow.first()
    }

    suspend fun saveCampusGeofence(geofence: CampusGeofence) {
        context.dataStore.edit { prefs ->
            prefs[KEY_CAMPUS_NAME] = geofence.name
            prefs[KEY_CAMPUS_LAT] = geofence.latitude
            prefs[KEY_CAMPUS_LNG] = geofence.longitude
            prefs[KEY_CAMPUS_RADIUS] = geofence.radiusMeters
            prefs[KEY_CAMPUS_ENABLED] = geofence.isEnabled
        }
    }
}
