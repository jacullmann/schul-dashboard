package app.schuldashboard.data.api

import kotlinx.serialization.json.Json
import retrofit2.HttpException

/** Reads the `{ error }` message the API returns on failure, else [fallback]. */
fun Throwable.apiErrorMessage(json: Json, fallback: String): String {
    val body = (this as? HttpException)?.response()?.errorBody()?.string() ?: return fallback
    val parsed = runCatching { json.decodeFromString<ApiErrorBody>(body) }.getOrNull()
    return parsed?.error?.takeIf { it.isNotBlank() }
        ?: parsed?.message?.takeIf { it.isNotBlank() }
        ?: fallback
}

/** Retrofit hands back failed [Response]s instead of throwing; callers that treat failure as an error use this. */
fun <T> retrofit2.Response<T>.requireSuccess(): retrofit2.Response<T> {
    if (!isSuccessful) throw HttpException(this)
    return this
}
