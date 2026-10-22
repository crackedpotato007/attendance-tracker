package com.bunkpulse.android.domain.repository

import com.bunkpulse.android.domain.model.CampusGeofence
import com.bunkpulse.android.domain.model.CustomHoliday
import com.bunkpulse.android.domain.model.WorkingDaysConfig
import kotlinx.coroutines.flow.Flow

interface ScheduleRepository {
    fun getScheduleFlow(): Flow<WorkingDaysConfig>
    suspend fun refreshSchedule(): Result<WorkingDaysConfig>
    suspend fun updateWorkingDays(activeDays: List<Int>): Result<WorkingDaysConfig>
    suspend fun updateGlobalTarget(target: Int): Result<WorkingDaysConfig>
    suspend fun addHoliday(name: String, startDate: String, endDate: String): Result<WorkingDaysConfig>
    suspend fun removeHoliday(holidayId: String): Result<WorkingDaysConfig>
    suspend fun updateCampusGeofence(geofence: CampusGeofence): Result<WorkingDaysConfig>
    suspend fun reconcileScheduleToday(): Result<String>
}
