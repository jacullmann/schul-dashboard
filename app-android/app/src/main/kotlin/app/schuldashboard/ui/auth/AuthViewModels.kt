package app.schuldashboard.ui.auth

import android.app.Application
import androidx.annotation.StringRes
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.LoginOutcome
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.api.apiErrorMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import java.util.Locale
import javax.inject.Inject

private val EMAIL_PATTERN = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
private const val MIN_PASSWORD_LENGTH = 8

data class AuthFormState(
    val email: String = "",
    val password: String = "",
    val passwordConfirm: String = "",
    val acceptedPrivacy: Boolean = false,
    val submitting: Boolean = false,
    @StringRes val emailError: Int? = null,
    @StringRes val passwordError: Int? = null,
    @StringRes val confirmError: Int? = null,
    @StringRes val privacyError: Int? = null,
    val serverError: String? = null,
    val registered: Boolean = false,
)

private fun AuthFormState.validatedEmailAndPassword(minLength: Int = MIN_PASSWORD_LENGTH): AuthFormState {
    val email = email.trim()
    return copy(
        emailError = when {
            email.isEmpty() -> R.string.error_email_missing
            !EMAIL_PATTERN.matches(email) -> R.string.error_email_wrong
            else -> null
        },
        passwordError = when {
            password.isEmpty() -> R.string.error_password_missing
            password.length < minLength -> R.string.error_password_short
            else -> null
        },
    )
}

private val AuthFormState.hasFieldErrors
    get() = emailError != null || passwordError != null || confirmError != null || privacyError != null

@HiltViewModel
class LoginViewModel @Inject constructor(
    application: Application,
    private val sessions: SessionRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    private val _state = MutableStateFlow(AuthFormState())
    val state: StateFlow<AuthFormState> = _state.asStateFlow()

    private val _mfaRequired = MutableSharedFlow<Unit>(extraBufferCapacity = 1)
    val mfaRequired: SharedFlow<Unit> = _mfaRequired.asSharedFlow()

    fun onEmail(value: String) = _state.update { it.copy(email = value, emailError = null, serverError = null) }

    fun onPassword(value: String) = _state.update { it.copy(password = value, passwordError = null, serverError = null) }

    fun submit() {
        val validated = _state.value.validatedEmailAndPassword()
        _state.value = validated
        if (validated.hasFieldErrors) return

        _state.update { it.copy(submitting = true) }
        viewModelScope.launch {
            try {
                if (sessions.login(validated.email.trim(), validated.password) == LoginOutcome.MfaRequired) {
                    _mfaRequired.tryEmit(Unit)
                }
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(serverError = e.apiErrorMessage(json, fallback)) }
            } finally {
                _state.update { it.copy(submitting = false) }
            }
        }
    }
}

@HiltViewModel
class RegisterViewModel @Inject constructor(
    application: Application,
    private val sessions: SessionRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    private val _state = MutableStateFlow(AuthFormState())
    val state: StateFlow<AuthFormState> = _state.asStateFlow()

    fun onEmail(value: String) = _state.update { it.copy(email = value, emailError = null, serverError = null) }

    fun onPassword(value: String) = _state.update { it.copy(password = value, passwordError = null, serverError = null) }

    fun onPasswordConfirm(value: String) =
        _state.update { it.copy(passwordConfirm = value, confirmError = null, serverError = null) }

    fun onPrivacy(value: Boolean) = _state.update { it.copy(acceptedPrivacy = value, privacyError = null) }

    fun submit() {
        val base = _state.value.validatedEmailAndPassword()
        val validated = base.copy(
            confirmError = if (base.password != base.passwordConfirm) R.string.error_confirm_wrong else null,
            privacyError = if (!base.acceptedPrivacy) R.string.error_terms_missing else null,
        )
        _state.value = validated
        if (validated.hasFieldErrors) return

        _state.update { it.copy(submitting = true) }
        viewModelScope.launch {
            try {
                sessions.register(validated.email.trim(), validated.password, Locale.getDefault().language)
                _state.update { it.copy(registered = true) }
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(serverError = e.apiErrorMessage(json, fallback)) }
            } finally {
                _state.update { it.copy(submitting = false) }
            }
        }
    }
}

data class MfaState(val code: String = "", val submitting: Boolean = false, val error: String? = null)

@HiltViewModel
class MfaViewModel @Inject constructor(
    application: Application,
    private val sessions: SessionRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    private val _state = MutableStateFlow(MfaState())
    val state: StateFlow<MfaState> = _state.asStateFlow()

    fun onCode(value: String) = _state.update { it.copy(code = value.filter(Char::isDigit).take(6), error = null) }

    fun submit() {
        val code = _state.value.code
        if (code.length != 6) return
        _state.update { it.copy(submitting = true) }
        viewModelScope.launch {
            try {
                sessions.verifyMfa(code)
            } catch (e: Exception) {
                val fallback = getApplication<Application>().getString(R.string.error_unknown)
                _state.update { it.copy(error = e.apiErrorMessage(json, fallback)) }
            } finally {
                _state.update { it.copy(submitting = false) }
            }
        }
    }

    fun cancel() {
        viewModelScope.launch { sessions.cancelMfa() }
    }
}
