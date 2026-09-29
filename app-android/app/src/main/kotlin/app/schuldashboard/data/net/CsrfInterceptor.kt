package app.schuldashboard.data.net

import okhttp3.Interceptor
import okhttp3.Response

private const val CSRF_COOKIE = "csrf_token"
private const val CSRF_HEADER = "x-csrf-token"

/** Echoes the CSRF cookie in a header, the double-submit scheme the server validates. */
class CsrfInterceptor(private val cookieJar: PersistentCookieJar) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val token = cookieJar.valueOf(request.url, CSRF_COOKIE)
        val withToken = if (token == null) request
        else request.newBuilder().header(CSRF_HEADER, token).build()
        return chain.proceed(withToken)
    }
}
