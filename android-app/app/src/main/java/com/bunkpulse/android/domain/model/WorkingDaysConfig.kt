package com.bunkpulse.android.domain.model

data class CustomHoliday(
    val id: String,
    val name: String,
    val startDate: String, // YYYY-MM-DD
    val endDate: String   // YYYY-MM-DD
) {
    fun isInHoliday(dateStr: String): Boolean {
        return dateStr in startDate..endDate
    }
}

data class CampusGeofence(
    val name: String = "College Campus",
    val latitude: Double = 0.0,
    val longitude: Double = 0.0,
    val radiusMeters: Int = 250,
    val isEnabled: Boolean = false
) {
    val isConfigured: Boolean get() = latitude != 0.0 || longitude != 0.0
}

data class WorkingDaysConfig(
    val activeDays: List<Int> = listOf(1, 2, 3, 4, 5, 6),
    val globalTarget: Int = 75,
    val customHolidays: List<CustomHoliday> = emptyList(),
    val campusGeofence: CampusGeofence = CampusGeofence()
)
