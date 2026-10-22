package com.bunkpulse.android.core.database

import android.content.Context
import androidx.room.Room
import com.bunkpulse.android.core.database.dao.AttendanceLogDao
import com.bunkpulse.android.core.database.dao.PendingSyncDao
import com.bunkpulse.android.core.database.dao.ScheduleDao
import com.bunkpulse.android.core.database.dao.SubjectDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): BunkPulseDatabase {
        return Room.databaseBuilder(
            context,
            BunkPulseDatabase::class.java,
            "bunkpulse.db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    fun provideSubjectDao(db: BunkPulseDatabase): SubjectDao = db.subjectDao()

    @Provides
    fun provideAttendanceLogDao(db: BunkPulseDatabase): AttendanceLogDao = db.attendanceLogDao()

    @Provides
    fun provideScheduleDao(db: BunkPulseDatabase): ScheduleDao = db.scheduleDao()

    @Provides
    fun providePendingSyncDao(db: BunkPulseDatabase): PendingSyncDao = db.pendingSyncDao()
}
