package com.bunkpulse.android.core.network

import com.bunkpulse.android.data.remote.dto.ErrorResponseDto
import kotlinx.serialization.json.Json
import okhttp3.ResponseBody

class ApiException(message: String, val code: Int = 0) : Exception(message)

object ApiErrorParser {
    private val json = Json { ignoreUnknownKeys = true }

    fun parseError(responseBody: ResponseBody?, defaultMessage: String = "Network request failed"): ApiException {
        if (responseBody == null) return ApiException(defaultMessage)
        return try {
            val content = responseBody.string()
            val parsed = json.decodeFromString<ErrorResponseDto>(content)
            ApiException(parsed.error)
        } catch (e: Exception) {
            ApiException(defaultMessage)
        }
    }
}
