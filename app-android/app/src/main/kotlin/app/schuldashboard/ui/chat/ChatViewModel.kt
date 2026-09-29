package app.schuldashboard.ui.chat

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.viewModelScope
import app.schuldashboard.R
import app.schuldashboard.data.AuthState
import app.schuldashboard.data.ChatEvent
import app.schuldashboard.data.ChatRepository
import app.schuldashboard.data.SessionRepository
import app.schuldashboard.data.api.MessageDto
import app.schuldashboard.data.api.apiErrorMessage
import app.schuldashboard.ui.common.Load
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import java.time.Instant
import javax.inject.Inject

data class ChatUiState(
    val messages: Load<List<MessageDto>> = Load.Loading,
    val input: String = "",
    val replyTo: MessageDto? = null,
    val firstNewMessageId: String? = null,
    val typingNames: Set<String> = emptySet(),
    val error: String? = null,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    application: Application,
    handle: SavedStateHandle,
    private val sessions: SessionRepository,
    private val chat: ChatRepository,
    private val json: Json,
) : AndroidViewModel(application) {
    private val groupId: String = checkNotNull(handle["groupId"])

    private val _state = MutableStateFlow(ChatUiState())
    val state: StateFlow<ChatUiState> = _state.asStateFlow()

    val currentUserId: String get() = (sessions.state.value as? AuthState.LoggedIn)?.user?.id.orEmpty()

    private val typingById = mutableMapOf<String, String>()

    init {
        load()
        viewModelScope.launch { chat.events(groupId).collect(::onEvent) }
    }

    private fun errorMessage(e: Throwable) =
        e.apiErrorMessage(json, getApplication<Application>().getString(R.string.error_unknown))

    fun load() {
        _state.update { it.copy(messages = Load.Loading) }
        viewModelScope.launch {
            runCatching { chat.messages(groupId) }
                .onSuccess { response ->
                    val visitedAt = response.lastVisitAt?.let { runCatching { Instant.parse(it) }.getOrNull() }
                    val firstNew = visitedAt?.let { visit ->
                        response.messages.firstOrNull { message ->
                            message.userId != currentUserId &&
                                runCatching { Instant.parse(message.createdAt).isAfter(visit) }.getOrDefault(false)
                        }
                    }
                    _state.update {
                        it.copy(messages = Load.Ready(response.messages), firstNewMessageId = firstNew?.id)
                    }
                    chat.markRead(groupId)
                }
                .onFailure { _state.update { it.copy(messages = Load.Failed()) } }
        }
    }

    private fun onEvent(event: ChatEvent) {
        when (event) {
            is ChatEvent.NewMessage -> {
                updateMessages { list -> if (list.any { it.id == event.message.id }) list else list + event.message }
                if (event.message.userId != currentUserId) viewModelScope.launch { chat.markRead(groupId) }
            }
            is ChatEvent.MessageDeleted -> {
                updateMessages { list ->
                    list.filterNot { it.id == event.messageId }.map { message ->
                        if (message.parentId == event.messageId) {
                            message.copy(parentId = null, parentContent = null, parentSenderName = null)
                        } else {
                            message
                        }
                    }
                }
                _state.update { if (it.replyTo?.id == event.messageId) it.copy(replyTo = null) else it }
            }
            is ChatEvent.Typing -> {
                if (event.userId == currentUserId) return
                if (event.isTyping) typingById[event.userId] = event.name else typingById.remove(event.userId)
                _state.update { it.copy(typingNames = typingById.values.toSet()) }
            }
        }
    }

    private fun updateMessages(transform: (List<MessageDto>) -> List<MessageDto>) {
        _state.update { s ->
            val list = (s.messages as? Load.Ready)?.value ?: return@update s
            s.copy(messages = Load.Ready(transform(list)))
        }
    }

    fun onInput(value: String) = _state.update { it.copy(input = value) }

    fun reply(message: MessageDto?) = _state.update { it.copy(replyTo = message) }

    fun clearError() = _state.update { it.copy(error = null) }

    fun send() {
        val current = _state.value
        val text = current.input.trim()
        if (text.isEmpty()) return
        _state.update { it.copy(input = "", replyTo = null, firstNewMessageId = null) }
        viewModelScope.launch {
            runCatching { chat.send(groupId, text, current.replyTo?.id) }.onFailure { e ->
                _state.update { it.copy(input = text, replyTo = current.replyTo, error = errorMessage(e)) }
            }
        }
    }

    fun delete(message: MessageDto) {
        viewModelScope.launch {
            runCatching { chat.delete(groupId, message.id) }
                .onFailure { e -> _state.update { it.copy(error = errorMessage(e)) } }
        }
    }

    fun report(message: MessageDto, reason: String) {
        viewModelScope.launch {
            runCatching { chat.report(groupId, message.id, reason.takeIf { it.isNotBlank() }) }
                .onFailure { e -> _state.update { it.copy(error = errorMessage(e)) } }
        }
    }
}
