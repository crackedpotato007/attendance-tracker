package com.bunkpulse.android

import android.app.Application
import androidx.hilt.work.HiltWorkerFactory
import androidx.work.*
import com.bunkpulse.android.core.worker.DailyReminderWorker
import com.bunkpulse.android.core.worker.GeofenceAttendanceWorker
import dagger.hilt.android.HiltAndroidApp
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltAndroidApp
class BunkPulseApp : Application(), Configuration.Provider {

    @Inject
    lateinit var workerFactory: HiltWorkerFactory

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setWorkerFactory(workerFactory)
            .build()

    override fun onCreate() {
        super.onCreate()
        scheduleDailyReminders()
        scheduleGeofenceWorker()
    }

    private fun scheduleDailyReminders() {
        val reminderRequest = PeriodicWorkRequestBuilder<DailyReminderWorker>(24, TimeUnit.HOURS)
            .setInitialDelay(2, TimeUnit.HOURS)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "DailyReminderJob",
            ExistingPeriodicWorkPolicy.KEEP,
            reminderRequest
        )
    }

    private fun scheduleGeofenceWorker() {
        val geofenceRequest = PeriodicWorkRequestBuilder<GeofenceAttendanceWorker>(15, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "GeofenceAttendanceJob",
            ExistingPeriodicWorkPolicy.KEEP,
            geofenceRequest
        )
    }
}
