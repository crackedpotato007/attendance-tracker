package com.bunkpulse.android.core.database.converter

import androidx.room.TypeConverter
import com.bunkpulse.android.domain.model.CustomHoliday
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class DatabaseTypeConverters {
    private val json = Json { ignoreUnknownKeys = true }

    @TypeConverter
    fun fromIntList(list: List<Int>?): String {
        return list?.joinToString(",") ?: ""
    }

    @TypeConverter
    fun toIntList(data: String?): List<Int> {
        if (data.isNullOrBlank()) return emptyList()
        return data.split(",").mapNotNull { it.trim().toIntOrNull() }
    }

    @TypeConverter
    fun fromHolidayList(list: List<CustomHoliday>?): String {
        if (list == null) return "[]"
        return json.encodeToString(list.map {
            mapOf("id" to it.id, "name" to it.name, "startDate" to it.startDate, "endDate" to it.endDate)
        })
    }

    @TypeConverter
    fun toHolidayList(data: String?): List<CustomHoliday> {
        if (data.isNullOrBlank()) return emptyList()
        return try {
            val raw = json.decodeFromString<List<Map<String, String>>>(data)
            raw.map {
                CustomHoliday(
                    id = it["id"] ?: "",
                    name = it["name"] ?: "",
                    startDate = it["startDate"] ?: "",
                    endDate = it["endDate"] ?: ""
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }
}
