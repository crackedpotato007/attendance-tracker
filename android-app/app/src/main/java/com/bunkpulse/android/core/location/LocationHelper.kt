package com.bunkpulse.android.core.location

import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import androidx.core.content.ContextCompat
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.coroutines.resume

object LocationHelper {

    fun hasLocationPermission(context: Context): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context,
            android.Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    fun calculateDistanceMeters(
        fromLat: Double,
        fromLng: Double,
        toLat: Double,
        toLng: Double
    ): Float {
        val results = FloatArray(1)
        Location.distanceBetween(fromLat, fromLng, toLat, toLng, results)
        return results[0]
    }

    fun formatDistance(meters: Float): String {
        return if (meters < 1000f) {
            "${meters.toInt()}m"
        } else {
            String.format(java.util.Locale.US, "%.1fkm", meters / 1000f)
        }
    }

    @SuppressLint("MissingPermission")
    suspend fun getCurrentLocation(context: Context, timeoutMs: Long = 8000L): Location? {
        if (!hasLocationPermission(context)) return null

        val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            ?: return null

        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

        if (!isGpsEnabled && !isNetworkEnabled) return null

        // 1. Try to get best recent last known location first
        var bestLastKnown: Location? = null
        if (isGpsEnabled) {
            val gpsLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            if (gpsLoc != null) bestLastKnown = gpsLoc
        }
        if (isNetworkEnabled) {
            val netLoc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            if (netLoc != null && (bestLastKnown == null || netLoc.time > bestLastKnown.time)) {
                bestLastKnown = netLoc
            }
        }

        // If last known location is fresh (< 2 minutes old), return it immediately
        if (bestLastKnown != null && System.currentTimeMillis() - bestLastKnown.time < 120_000L) {
            return bestLastKnown
        }

        // 2. Otherwise request a single fresh fix with coroutine timeout
        val freshLocation = withTimeoutOrNull(timeoutMs) {
            suspendCancellableCoroutine<Location?> { continuation ->
                val listener = object : LocationListener {
                    override fun onLocationChanged(location: Location) {
                        locationManager.removeUpdates(this)
                        if (continuation.isActive) continuation.resume(location)
                    }

                    @Deprecated("Deprecated in Java")
                    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                    override fun onProviderEnabled(provider: String) {}
                    override fun onProviderDisabled(provider: String) {}
                }

                continuation.invokeOnCancellation {
                    locationManager.removeUpdates(listener)
                }

                try {
                    val provider = if (isGpsEnabled) LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
                    locationManager.requestSingleUpdate(provider, listener, Looper.getMainLooper())
                } catch (e: Exception) {
                    if (continuation.isActive) continuation.resume(null)
                }
            }
        }

        return freshLocation ?: bestLastKnown
    }
}
