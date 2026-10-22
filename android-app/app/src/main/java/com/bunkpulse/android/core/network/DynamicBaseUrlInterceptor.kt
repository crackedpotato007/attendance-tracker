package com.bunkpulse.android.core.network

import com.bunkpulse.android.core.datastore.SessionAndServerManager
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Interceptor that rewrites request URL dynamically based on Server Base URL in DataStore
 */
@Singleton
class DynamicBaseUrlInterceptor @Inject constructor(
    private val sessionManager: SessionAndServerManager
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val customBaseUrlStr = runBlocking { sessionManager.getBaseUrl() }
        val newBaseUrl = customBaseUrlStr.toHttpUrlOrNull()

        if (newBaseUrl == null || (newBaseUrl.scheme != "http" && newBaseUrl.scheme != "https")) {
            return chain.proceed(originalRequest)
        }

        val originalHttpUrl = originalRequest.url
        // Extract relative endpoint path after "/api/"
        val fullEncodedPath = originalHttpUrl.encodedPath
        val apiIdx = fullEncodedPath.indexOf("/api/")
        val relativeEndpoint = if (apiIdx >= 0) {
            fullEncodedPath.substring(apiIdx + 5)
        } else {
            fullEncodedPath.trimStart('/')
        }

        val baseEncodedPath = newBaseUrl.encodedPath.trimEnd('/')
        val combinedPath = "$baseEncodedPath/$relativeEndpoint"

        val newHttpUrl = originalHttpUrl.newBuilder()
            .scheme(newBaseUrl.scheme)
            .host(newBaseUrl.host)
            .port(newBaseUrl.port)
            .encodedPath(combinedPath)
            .build()

        val newRequest = originalRequest.newBuilder()
            .url(newHttpUrl)
            .build()

        return chain.proceed(newRequest)
    }
}
