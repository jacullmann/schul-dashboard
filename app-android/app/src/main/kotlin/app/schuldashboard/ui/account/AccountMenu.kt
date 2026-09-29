package app.schuldashboard.ui.account

import android.app.Activity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AppPreferences
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.ThemeMode
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.ui.common.Avatar
import app.schuldashboard.ui.design.Menu
import app.schuldashboard.ui.design.MenuButton
import app.schuldashboard.ui.design.MenuDivider
import app.schuldashboard.ui.design.MenuSelect
import app.schuldashboard.ui.design.pillButton
import app.schuldashboard.ui.icons.Lucide
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AccountMenuViewModel @Inject constructor(
    private val api: SchulApi,
    private val sessions: SessionRepository,
    private val preferences: AppPreferences,
) : ViewModel() {
    val theme = preferences.theme
    val language: String? get() = preferences.language
    val user = sessions.state.map { (it as? AuthState.LoggedIn)?.user }
    var updatingPersonalization by mutableStateOf(false)
        private set

    fun setTheme(mode: ThemeMode) {
        preferences.setTheme(mode)
        viewModelScope.launch { runCatching { api.setPreference(mapOf("theme" to mode.key)) } }
    }

    fun setLanguage(language: String, onApplied: () -> Unit) {
        preferences.setLanguage(language)
        viewModelScope.launch {
            runCatching { api.setPreference(mapOf("language" to language)) }
            onApplied()
        }
    }

    fun setPersonalization(value: Boolean) {
        updatingPersonalization = true
        viewModelScope.launch {
            runCatching { sessions.setPersonalization(value) }
            updatingPersonalization = false
        }
    }

    fun logout() {
        viewModelScope.launch { sessions.logout() }
    }
}

/**
 * AccountMenu: the header's avatar, opening the account sheet titled with the email address.
 */
@Composable
fun AccountMenu(onAccountSettings: () -> Unit, viewModel: AccountMenuViewModel = hiltViewModel()) {
    val user by viewModel.user.collectAsStateWithLifecycle(null)
    val theme by viewModel.theme.collectAsStateWithLifecycle()
    val current = user ?: return
    var open by remember { mutableStateOf(false) }
    val activity = LocalContext.current as? Activity

    Box(Modifier.pillButton { open = true }.padding(4.dp)) { Avatar(current.email, size = 32.dp) }
    Menu(open, { open = false }, title = current.email) {
        MenuButton(stringResource(R.string.account_settings_title), { open = false; onAccountSettings() }, icon = Lucide.Settings)
        MenuSelect(
            stringResource(R.string.personalization_label),
            listOf(
                Triple(true, stringResource(R.string.personalization_mine), Lucide.Filter),
                Triple(false, stringResource(R.string.personalization_all), Lucide.LayoutGrid),
            ),
            current.personalized,
            { if (it != current.personalized) viewModel.setPersonalization(it) },
            enabled = !viewModel.updatingPersonalization,
        )
        MenuDivider()
        MenuSelect(
            stringResource(R.string.theme_label),
            listOf(
                Triple(ThemeMode.System, stringResource(R.string.theme_system), Lucide.SunMoon),
                Triple(ThemeMode.Dark, stringResource(R.string.theme_dark), Lucide.Moon),
                Triple(ThemeMode.Light, stringResource(R.string.theme_light), Lucide.Sun),
            ),
            theme,
            viewModel::setTheme,
        )
        MenuSelect(
            stringResource(R.string.account_language),
            listOf(Triple("de", "Deutsch", Lucide.Languages), Triple("en", "English", Lucide.Languages)),
            viewModel.language ?: java.util.Locale.getDefault().language.takeIf { it == "de" || it == "en" } ?: "de",
            { if (it != viewModel.language) viewModel.setLanguage(it) { activity?.recreate() } },
        )
        MenuDivider()
        MenuButton(stringResource(R.string.account_logout), { open = false; viewModel.logout() }, icon = Lucide.LogOut)
    }
}
