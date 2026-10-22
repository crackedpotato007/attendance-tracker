package com.bunkpulse.android.domain.calculator

import com.bunkpulse.android.core.location.LocationHelper
import com.bunkpulse.android.domain.model.CampusGeofence
import com.bunkpulse.android.domain.model.Subject
import org.junit.Assert.*
import org.junit.Test

class CampusGeofenceTest {

    @Test
    fun testCampusGeofence_configuration() {
        val unconfigured = CampusGeofence(latitude = 0.0, longitude = 0.0)
        assertFalse(unconfigured.isConfigured)

        val configured = CampusGeofence(latitude = 28.545, longitude = 77.192, radiusMeters = 300, isEnabled = true)
        assertTrue(configured.isConfigured)
        assertEquals(300, configured.radiusMeters)
        assertTrue(configured.isEnabled)
    }

    @Test
    fun testLocationHelper_formatDistance() {
        assertEquals("45m", LocationHelper.formatDistance(45.2f))
        assertEquals("500m", LocationHelper.formatDistance(500.0f))
        assertEquals("1.2km", LocationHelper.formatDistance(1200f))
        assertEquals("3.5km", LocationHelper.formatDistance(3500f))
    }

    @Test
    fun testSubject_lectureTimeField() {
        val sub = Subject(
            id = "test-1",
            code = "CS201",
            name = "Data Structures",
            lectureTime = "10:30"
        )
        assertEquals("10:30", sub.lectureTime)
    }
}
