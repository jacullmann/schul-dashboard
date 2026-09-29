package app.schuldashboard.data.net

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import okhttp3.Authenticator
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

private const val REFRESH_PATH = "/auth/refresh"
private val NO_REFRESH_PATHS = setOf(REFRESH_PATH, "/auth/login", "/auth/register", "/auth/mfa/verify")

/** Emitted when the refresh token is rejected and the user has to sign in again. */
@Singleton
class SessionEvents @Inject constructor() {
    private val _expired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val expired: SharedFlow<Unit> = _expired.asSharedFlow()

    fun notifyExpired() {
        _expired.tryEmit(Unit)
    }
}

/**
 * Refresh tokens rotate on every use, so refreshes are serialized. A request that failed before
 * another caller's refresh finished retries with the cookies that refresh set instead of rotating again.
 */
@Singleton
class SessionAuthenticator @Inject constructor(
    private val client: Provider<OkHttpClient>,
    private val events: SessionEvents,
) : Authenticator {
    private val lock = Any()
    private var lastRefreshAt = 0L

    override fun authenticate(route: Route?, response: Response): Request? {
        val path = response.request.url.encodedPath
        if (NO_REFRESH_PATHS.any { path.endsWith(it) } || responseCount(response) > 1) return null

        synchronized(lock) {
            val alreadyRefreshed = lastRefreshAt >= response.sentRequestAtMillis
            if (!alreadyRefreshed && !postRefresh(response.request)) {
                events.notifyExpired()
                return null
            }
        }
        return response.request.newBuilder().build()
    }

    private fun postRefresh(original: Request): Boolean {
        val refresh = Request.Builder()
            .url(original.url.newBuilder().encodedPath(REFRESH_PATH).query(null).build())
            .post(ByteArray(0).toRequestBody())
            .build()
        return runCatching {
            client.get().newCall(refresh).execute().use { it.isSuccessful }
        }.getOrDefault(false).also { ok -> if (ok) lastRefreshAt = System.currentTimeMillis() }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
