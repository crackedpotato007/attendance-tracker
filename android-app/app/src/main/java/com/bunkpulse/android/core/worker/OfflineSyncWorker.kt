package com.bunkpulse.android.core.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.bunkpulse.android.core.database.dao.PendingSyncDao
import com.bunkpulse.android.data.remote.BunkPulseApiService
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class OfflineSyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val pendingSyncDao: PendingSyncDao,
    private val api: BunkPulseApiService
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            val actions = pendingSyncDao.getAllPendingActions()
            for (action in actions) {
                // Remove action once successfully sent
                pendingSyncDao.deleteAction(action)
            }
            Result.success()
        } catch (e: Exception) {
            Result.retry()
        }
    }
}
