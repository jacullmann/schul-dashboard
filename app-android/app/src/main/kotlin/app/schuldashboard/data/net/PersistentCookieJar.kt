package app.schuldashboard.data.net

import android.content.Context
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrl

/**
 * The API authenticates with cookies (access, refresh, CSRF), so they must survive process death
 * for the session to survive it. Cookies are kept in app-private preferences.
 */
class PersistentCookieJar(context: Context) : CookieJar {
    private val prefs = context.getSharedPreferences("cookies", Context.MODE_PRIVATE)
    private val cookies = LinkedHashMap<String, StoredCookie>()

    private data class StoredCookie(val origin: HttpUrl, val cookie: Cookie)

    init {
        prefs.all.forEach { (key, value) ->
            val stored = (value as? String)?.let(::decode) ?: return@forEach
            if (stored.cookie.expiresAt > System.currentTimeMillis()) cookies[key] = stored
            else prefs.edit().remove(key).apply()
        }
    }

    @Synchronized
    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val editor = prefs.edit()
        cookies.forEach { cookie ->
            val key = keyOf(cookie)
            if (cookie.expiresAt <= System.currentTimeMillis()) {
                this.cookies.remove(key)
                editor.remove(key)
            } else {
                this.cookies[key] = StoredCookie(url, cookie)
                editor.putString(key, encode(url, cookie))
            }
        }
        editor.apply()
    }

    @Synchronized
    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val now = System.currentTimeMillis()
        return cookies.values.map { it.cookie }.filter { it.expiresAt > now && it.matches(url) }
    }

    @Synchronized
    fun valueOf(url: HttpUrl, name: String): String? =
        loadForRequest(url).firstOrNull { it.name == name }?.value

    @Synchronized
    fun clear() {
        cookies.clear()
        prefs.edit().clear().apply()
    }

    private fun keyOf(cookie: Cookie) = "${cookie.name};${cookie.domain};${cookie.path}"

    private fun encode(origin: HttpUrl, cookie: Cookie) = "$origin\n$cookie"

    private fun decode(raw: String): StoredCookie? {
        val separator = raw.indexOf('\n')
        if (separator < 0) return null
        val origin = raw.substring(0, separator).toHttpUrl()
        val cookie = Cookie.parse(origin, raw.substring(separator + 1)) ?: return null
        return StoredCookie(origin, cookie)
    }
}
