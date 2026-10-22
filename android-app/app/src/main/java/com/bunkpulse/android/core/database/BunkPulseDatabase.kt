package com.bunkpulse.android.core.database

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.bunkpulse.android.core.database.converter.DatabaseTypeConverters
import com.bunkpulse.android.core.database.dao.AttendanceLogDao
import com.bunkpulse.android.core.database.dao.PendingSyncDao
import com.bunkpulse.android.core.database.dao.ScheduleDao
import com.bunkpulse.android.core.database.dao.SubjectDao
import com.bunkpulse.android.core.database.entity.AttendanceLogEntity
import com.bunkpulse.android.core.database.entity.PendingSyncEntity
import com.bunkpulse.android.core.database.entity.ScheduleEntity
import com.bunkpulse.android.core.database.entity.SubjectEntity

@Database(
    entities = [
        SubjectEntity::class,
        AttendanceLogEntity::class,
        ScheduleEntity::class,
        PendingSyncEntity::class
    ],
    version = 2,
    exportSchema = false
)
@TypeConverters(DatabaseTypeConverters::class)
abstract class BunkPulseDatabase : RoomDatabase() {
    abstract fun subjectDao(): SubjectDao
    abstract fun attendanceLogDao(): AttendanceLogDao
    abstract fun scheduleDao(): ScheduleDao
    abstract fun pendingSyncDao(): PendingSyncDao
}
