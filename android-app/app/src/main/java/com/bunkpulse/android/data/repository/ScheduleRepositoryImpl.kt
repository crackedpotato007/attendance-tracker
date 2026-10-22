package com.bunkpulse.android.data.repository

import com.bunkpulse.android.core.database.dao.ScheduleDao
import com.bunkpulse.android.core.database.entity.ScheduleEntity
import com.bunkpulse.android.core.datastore.SessionAndServerManager
import com.bunkpulse.android.core.network.ApiErrorParser
import com.bunkpulse.android.data.remote.BunkPulseApiService
import com.bunkpulse.android.data.remote.dto.CustomHolidayDto
import com.bunkpulse.android.data.remote.dto.UpdateScheduleRequestDto
import com.bunkpulse.android.domain.model.CampusGeofence
import com.bunkpulse.android.domain.model.CustomHoliday
import com.bunkpulse.android.domain.model.WorkingDaysConfig
import com.bunkpulse.android.domain.repository.ScheduleRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ScheduleRepositoryImpl @Inject constructor(
    private val api: BunkPulseApiService,
    private val scheduleDao: ScheduleDao,
    private val sessionManager: SessionAndServerManager
) : ScheduleRepository {

    override fun getScheduleFlow(): Flow<WorkingDaysConfig> {
        return scheduleDao.getScheduleFlow().map { entity ->
            entity?.toDomain() ?: WorkingDaysConfig()
        }
    }

    override suspend fun refreshSchedule(): Result<WorkingDaysConfig> {
        return try {
            val response = api.getSchedule()
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val existingLocal = sessionManager.getCampusGeofence()
                val serverHasLocation = dto.campusLat != 0.0 || dto.campusLng != 0.0
                val geofence = CampusGeofence(
                    name = if (dto.campusName.isNotBlank()) dto.campusName else existingLocal.name,
                    latitude = if (serverHasLocation) dto.campusLat else existingLocal.latitude,
                    longitude = if (serverHasLocation) dto.campusLng else existingLocal.longitude,
                    radiusMeters = if (dto.campusRadius > 0) dto.campusRadius else existingLocal.radiusMeters,
                    isEnabled = if (serverHasLocation) dto.geoAttendanceEnabled else existingLocal.isEnabled
                )
                sessionManager.saveCampusGeofence(geofence)

                val config = WorkingDaysConfig(
                    activeDays = dto.activeDays,
                    globalTarget = dto.globalTarget,
                    customHolidays = dto.customHolidays.map {
                        CustomHoliday(
                            id = it.resolvedId,
                            name = it.name,
                            startDate = it.resolvedStart,
                            endDate = it.resolvedEnd
                        )
                    },
                    campusGeofence = geofence
                )
                scheduleDao.insertSchedule(
                    ScheduleEntity(
                        activeDays = config.activeDays,
                        globalTarget = config.globalTarget,
                        customHolidays = config.customHolidays,
                        campusName = geofence.name,
                        campusLatitude = geofence.latitude,
                        campusLongitude = geofence.longitude,
                        campusRadiusMeters = geofence.radiusMeters,
                        geofenceEnabled = geofence.isEnabled
                    )
                )
                Result.success(config)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to fetch schedule."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateWorkingDays(activeDays: List<Int>): Result<WorkingDaysConfig> {
        return try {
            val currentEntity = scheduleDao.getScheduleFlow().first()
            val currentTarget = currentEntity?.globalTarget ?: 75
            val currentHolidays = currentEntity?.customHolidays ?: emptyList()
            val currentCampus = currentEntity?.toDomain()?.campusGeofence ?: sessionManager.getCampusGeofence()

            // Update Room locally
            scheduleDao.insertSchedule(
                ScheduleEntity(
                    activeDays = activeDays,
                    globalTarget = currentTarget,
                    customHolidays = currentHolidays,
                    campusName = currentCampus.name,
                    campusLatitude = currentCampus.latitude,
                    campusLongitude = currentCampus.longitude,
                    campusRadiusMeters = currentCampus.radiusMeters,
                    geofenceEnabled = currentCampus.isEnabled
                )
            )

            val response = api.updateSchedule(UpdateScheduleRequestDto(activeDays = activeDays))
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val existingLocal = sessionManager.getCampusGeofence()
                val serverHasLocation = dto.campusLat != 0.0 || dto.campusLng != 0.0
                val geofence = CampusGeofence(
                    name = if (dto.campusName.isNotBlank()) dto.campusName else existingLocal.name,
                    latitude = if (serverHasLocation) dto.campusLat else existingLocal.latitude,
                    longitude = if (serverHasLocation) dto.campusLng else existingLocal.longitude,
                    radiusMeters = if (dto.campusRadius > 0) dto.campusRadius else existingLocal.radiusMeters,
                    isEnabled = if (serverHasLocation) dto.geoAttendanceEnabled else existingLocal.isEnabled
                )
                val config = WorkingDaysConfig(
                    activeDays = dto.activeDays,
                    globalTarget = dto.globalTarget,
                    customHolidays = dto.customHolidays.map {
                        CustomHoliday(id = it.resolvedId, name = it.name, startDate = it.resolvedStart, endDate = it.resolvedEnd)
                    },
                    campusGeofence = geofence
                )
                scheduleDao.insertSchedule(
                    ScheduleEntity(
                        activeDays = config.activeDays,
                        globalTarget = config.globalTarget,
                        customHolidays = config.customHolidays,
                        campusName = geofence.name,
                        campusLatitude = geofence.latitude,
                        campusLongitude = geofence.longitude,
                        campusRadiusMeters = geofence.radiusMeters,
                        geofenceEnabled = geofence.isEnabled
                    )
                )
                Result.success(config)
            } else {
                Result.success(
                    WorkingDaysConfig(
                        activeDays = activeDays,
                        globalTarget = currentTarget,
                        customHolidays = currentHolidays,
                        campusGeofence = currentCampus
                    )
                )
            }
        } catch (e: Exception) {
            val fallback = scheduleDao.getScheduleFlow().first()?.toDomain() ?: WorkingDaysConfig(activeDays = activeDays)
            Result.success(fallback)
        }
    }

    override suspend fun updateGlobalTarget(target: Int): Result<WorkingDaysConfig> {
        return try {
            val response = api.updateSchedule(UpdateScheduleRequestDto(globalTarget = target))
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val existingLocal = sessionManager.getCampusGeofence()
                val serverHasLocation = dto.campusLat != 0.0 || dto.campusLng != 0.0
                val geofence = CampusGeofence(
                    name = if (dto.campusName.isNotBlank()) dto.campusName else existingLocal.name,
                    latitude = if (serverHasLocation) dto.campusLat else existingLocal.latitude,
                    longitude = if (serverHasLocation) dto.campusLng else existingLocal.longitude,
                    radiusMeters = if (dto.campusRadius > 0) dto.campusRadius else existingLocal.radiusMeters,
                    isEnabled = if (serverHasLocation) dto.geoAttendanceEnabled else existingLocal.isEnabled
                )
                val config = WorkingDaysConfig(
                    activeDays = dto.activeDays,
                    globalTarget = dto.globalTarget,
                    customHolidays = dto.customHolidays.map {
                        CustomHoliday(id = it.resolvedId, name = it.name, startDate = it.resolvedStart, endDate = it.resolvedEnd)
                    },
                    campusGeofence = geofence
                )
                scheduleDao.insertSchedule(
                    ScheduleEntity(
                        activeDays = config.activeDays,
                        globalTarget = config.globalTarget,
                        customHolidays = config.customHolidays,
                        campusName = geofence.name,
                        campusLatitude = geofence.latitude,
                        campusLongitude = geofence.longitude,
                        campusRadiusMeters = geofence.radiusMeters,
                        geofenceEnabled = geofence.isEnabled
                    )
                )
                Result.success(config)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to update target."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun addHoliday(name: String, startDate: String, endDate: String): Result<WorkingDaysConfig> {
        return try {
            val current = api.getSchedule().body()?.customHolidays ?: emptyList()
            val newHoliday = CustomHolidayDto(
                name = name.trim(),
                startDate = startDate,
                endDate = endDate
            )
            val updatedList = current + newHoliday
            val response = api.updateSchedule(UpdateScheduleRequestDto(customHolidays = updatedList))
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val existingLocal = sessionManager.getCampusGeofence()
                val serverHasLocation = dto.campusLat != 0.0 || dto.campusLng != 0.0
                val geofence = CampusGeofence(
                    name = if (dto.campusName.isNotBlank()) dto.campusName else existingLocal.name,
                    latitude = if (serverHasLocation) dto.campusLat else existingLocal.latitude,
                    longitude = if (serverHasLocation) dto.campusLng else existingLocal.longitude,
                    radiusMeters = if (dto.campusRadius > 0) dto.campusRadius else existingLocal.radiusMeters,
                    isEnabled = if (serverHasLocation) dto.geoAttendanceEnabled else existingLocal.isEnabled
                )
                val config = WorkingDaysConfig(
                    activeDays = dto.activeDays,
                    globalTarget = dto.globalTarget,
                    customHolidays = dto.customHolidays.map {
                        CustomHoliday(id = it.resolvedId, name = it.name, startDate = it.resolvedStart, endDate = it.resolvedEnd)
                    },
                    campusGeofence = geofence
                )
                scheduleDao.insertSchedule(
                    ScheduleEntity(
                        activeDays = config.activeDays,
                        globalTarget = config.globalTarget,
                        customHolidays = config.customHolidays,
                        campusName = geofence.name,
                        campusLatitude = geofence.latitude,
                        campusLongitude = geofence.longitude,
                        campusRadiusMeters = geofence.radiusMeters,
                        geofenceEnabled = geofence.isEnabled
                    )
                )
                Result.success(config)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to add holiday."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun removeHoliday(holidayId: String): Result<WorkingDaysConfig> {
        return try {
            val current = api.getSchedule().body()?.customHolidays ?: emptyList()
            val filtered = current.filter { it.resolvedId != holidayId }
            val response = api.updateSchedule(UpdateScheduleRequestDto(customHolidays = filtered))
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val existingLocal = sessionManager.getCampusGeofence()
                val serverHasLocation = dto.campusLat != 0.0 || dto.campusLng != 0.0
                val geofence = CampusGeofence(
                    name = if (dto.campusName.isNotBlank()) dto.campusName else existingLocal.name,
                    latitude = if (serverHasLocation) dto.campusLat else existingLocal.latitude,
                    longitude = if (serverHasLocation) dto.campusLng else existingLocal.longitude,
                    radiusMeters = if (dto.campusRadius > 0) dto.campusRadius else existingLocal.radiusMeters,
                    isEnabled = if (serverHasLocation) dto.geoAttendanceEnabled else existingLocal.isEnabled
                )
                val config = WorkingDaysConfig(
                    activeDays = dto.activeDays,
                    globalTarget = dto.globalTarget,
                    customHolidays = dto.customHolidays.map {
                        CustomHoliday(id = it.resolvedId, name = it.name, startDate = it.resolvedStart, endDate = it.resolvedEnd)
                    },
                    campusGeofence = geofence
                )
                scheduleDao.insertSchedule(
                    ScheduleEntity(
                        activeDays = config.activeDays,
                        globalTarget = config.globalTarget,
                        customHolidays = config.customHolidays,
                        campusName = geofence.name,
                        campusLatitude = geofence.latitude,
                        campusLongitude = geofence.longitude,
                        campusRadiusMeters = geofence.radiusMeters,
                        geofenceEnabled = geofence.isEnabled
                    )
                )
                Result.success(config)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to remove holiday."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateCampusGeofence(geofence: CampusGeofence): Result<WorkingDaysConfig> {
        // 1. Immediately persist locally (offline-first)
        sessionManager.saveCampusGeofence(geofence)
        val currentEntity = scheduleDao.getScheduleFlow().first()
        val currentActiveDays = currentEntity?.activeDays ?: listOf(1, 2, 3, 4, 5, 6)
        val currentTarget = currentEntity?.globalTarget ?: 75
        val currentHolidays = currentEntity?.customHolidays ?: emptyList()

        val updatedEntity = ScheduleEntity(
            activeDays = currentActiveDays,
            globalTarget = currentTarget,
            customHolidays = currentHolidays,
            campusName = geofence.name,
            campusLatitude = geofence.latitude,
            campusLongitude = geofence.longitude,
            campusRadiusMeters = geofence.radiusMeters,
            geofenceEnabled = geofence.isEnabled
        )
        scheduleDao.insertSchedule(updatedEntity)
        val localConfig = updatedEntity.toDomain()

        // 2. Sync to API in background
        return try {
            val request = UpdateScheduleRequestDto(
                campusName = geofence.name,
                campusLat = geofence.latitude,
                campusLng = geofence.longitude,
                campusRadius = geofence.radiusMeters,
                geoAttendanceEnabled = geofence.isEnabled
            )
            val response = api.updateSchedule(request)
            if (response.isSuccessful && response.body() != null) {
                val dto = response.body()!!
                val serverHasLocation = dto.campusLat != 0.0 || dto.campusLng != 0.0
                val updatedGeofence = CampusGeofence(
                    name = if (dto.campusName.isNotBlank()) dto.campusName else geofence.name,
                    latitude = if (serverHasLocation) dto.campusLat else geofence.latitude,
                    longitude = if (serverHasLocation) dto.campusLng else geofence.longitude,
                    radiusMeters = if (dto.campusRadius > 0) dto.campusRadius else geofence.radiusMeters,
                    isEnabled = if (serverHasLocation) dto.geoAttendanceEnabled else geofence.isEnabled
                )
                val config = WorkingDaysConfig(
                    activeDays = dto.activeDays,
                    globalTarget = dto.globalTarget,
                    customHolidays = dto.customHolidays.map {
                        CustomHoliday(id = it.resolvedId, name = it.name, startDate = it.resolvedStart, endDate = it.resolvedEnd)
                    },
                    campusGeofence = updatedGeofence
                )
                scheduleDao.insertSchedule(
                    ScheduleEntity(
                        activeDays = config.activeDays,
                        globalTarget = config.globalTarget,
                        customHolidays = config.customHolidays,
                        campusName = updatedGeofence.name,
                        campusLatitude = updatedGeofence.latitude,
                        campusLongitude = updatedGeofence.longitude,
                        campusRadiusMeters = updatedGeofence.radiusMeters,
                        geofenceEnabled = updatedGeofence.isEnabled
                    )
                )
                Result.success(config)
            } else {
                Result.success(localConfig)
            }
        } catch (e: Exception) {
            Result.success(localConfig)
        }
    }

    override suspend fun reconcileScheduleToday(): Result<String> {
        return try {
            val response = api.reconcileScheduleNow()
            if (response.isSuccessful && response.body() != null) {
                Result.success(response.body()!!.message)
            } else {
                Result.failure(ApiErrorParser.parseError(response.errorBody(), "Failed to reconcile schedule."))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
