package app.schuldashboard

import android.content.Context
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import android.graphics.Color
import androidx.activity.SystemBarStyle
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.DisposableEffect
import app.schuldashboard.ui.theme.isDark
import androidx.compose.runtime.getValue
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import app.schuldashboard.ui.design.BackdropBlurSupported
import app.schuldashboard.ui.design.LocalPageBackdrop
import app.schuldashboard.ui.design.LocalToaster
import app.schuldashboard.ui.design.ToastHost
import app.schuldashboard.ui.design.Toaster
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.schuldashboard.data.AppPreferences
import app.schuldashboard.ui.navigation.AppNavHost
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.SchulTheme
import dagger.hilt.android.AndroidEntryPoint
import dev.chrisbanes.haze.hazeSource
import dev.chrisbanes.haze.rememberHazeState
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var preferences: AppPreferences

    override fun attachBaseContext(newBase: Context) {
        // Hilt has not injected yet here, so the stored language is read directly.
        super.attachBaseContext(AppPreferences(newBase.applicationContext).localized(newBase))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val theme by preferences.theme.collectAsStateWithLifecycle()
            val dark = theme.isDark()
            // The bar icons follow the app's theme, which can differ from the device's.
            DisposableEffect(dark) {
                enableEdgeToEdge(
                    statusBarStyle = if (dark) SystemBarStyle.dark(Color.TRANSPARENT) else SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
                    navigationBarStyle = if (dark) SystemBarStyle.dark(Color.TRANSPARENT) else SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT),
                )
                onDispose {}
            }
            val toaster = remember { Toaster() }
            val page = rememberHazeState(blurEnabled = BackdropBlurSupported)
            SchulTheme(theme) {
                CompositionLocalProvider(LocalToaster provides toaster, LocalPageBackdrop provides page) {
                    Box(Modifier.fillMaxSize().hazeSource(page).background(AppTheme.colors.canvas)) {
                        AppNavHost()
                        ToastHost(toaster)
                    }
                }
            }
        }
    }
}
