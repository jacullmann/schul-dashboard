package app.schuldashboard.data

import app.schuldashboard.BuildConfig
import app.schuldashboard.data.api.MessageDto
import app.schuldashboard.data.api.MessagesResponse
import app.schuldashboard.data.api.ReportMessageRequest
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.SendMessageRequest
import app.schuldashboard.data.api.WsClientEvent
import app.schuldashboard.data.api.WsServerEvent
import app.schuldashboard.data.api.requireSuccess
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.channelFlow
import kotlinx.coroutines.isActive
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.min

sealed interface ChatEvent {
    data class NewMessage(val message: MessageDto) : ChatEvent
    data class MessageDeleted(val messageId: String) : ChatEvent
    data class Typing(val userId: String, val name: String, val isTyping: Boolean) : ChatEvent
}

private const val WS_CLOSE_TOKEN_EXPIRED = 4001
private const val WS_CLOSE_ACCESS_REVOKED = 4003
private const val MAX_RECONNECT_ATTEMPTS = 5

@Singleton
class ChatRepository @Inject constructor(
    private val api: SchulApi,
    private val client: OkHttpClient,
    private val json: Json,
) {
    suspend fun messages(groupId: String): MessagesResponse = api.messages(groupId)

    suspend fun send(groupId: String, content: String, parentId: String?) {
        api.sendMessage(groupId, SendMessageRequest(content, parentId)).requireSuccess()
    }

    suspend fun delete(groupId: String, messageId: String) {
        api.deleteMessage(groupId, messageId).requireSuccess()
    }

    suspend fun markRead(groupId: String) {
        runCatching { api.markMessagesRead(groupId) }
    }

    suspend fun report(groupId: String, messageId: String, reason: String?) {
        api.reportMessage(groupId, ReportMessageRequest(messageId, reason)).requireSuccess()
    }

    /** Live events of one group; reconnects with backoff and refreshes the session when the token expired. */
    fun events(groupId: String): Flow<ChatEvent> = channelFlow {
        var attempts = 0
        var socket: WebSocket? = null

        suspend fun connect() {
            val closed = CompletableDeferred<Int>()
            socket = client.newWebSocket(
                Request.Builder().url(webSocketUrl()).build(),
                object : WebSocketListener() {
                    override fun onOpen(webSocket: WebSocket, response: Response) {
                        attempts = 0
                        webSocket.send(json.encodeToString(WsClientEvent("joinGroup", groupId)))
                    }

                    override fun onMessage(webSocket: WebSocket, text: String) {
                        val event = runCatching { json.decodeFromString<WsServerEvent>(text) }.getOrNull() ?: return
                        when (event.type) {
                            "newMessage" -> event.message?.let { trySend(ChatEvent.NewMessage(it)) }
                            "messageDeleted" -> event.messageId?.let { trySend(ChatEvent.MessageDeleted(it)) }
                            "userTyping" -> if (event.userId != null) {
                                trySend(
                                    ChatEvent.Typing(event.userId, event.senderName.orEmpty(), event.isTyping == true),
                                )
                            }
                        }
                    }

                    override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                        closed.complete(code)
                    }

                    override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                        closed.complete(-1)
                    }
                },
            )
            when (closed.await()) {
                WS_CLOSE_ACCESS_REVOKED -> attempts = MAX_RECONNECT_ATTEMPTS + 1
                WS_CLOSE_TOKEN_EXPIRED -> {
                    // A failed refresh ends the session through the global auth handler.
                    val refreshed = runCatching { api.refresh().isSuccessful }.getOrDefault(false)
                    attempts = if (refreshed) 0 else MAX_RECONNECT_ATTEMPTS + 1
                }
                else -> attempts++
            }
        }

        try {
            while (isActive && attempts <= MAX_RECONNECT_ATTEMPTS) {
                connect()
                if (attempts in 1..MAX_RECONNECT_ATTEMPTS) delay(min(1000L shl attempts, 30_000L))
            }
        } finally {
            socket?.close(1000, null)
        }
    }

    private fun webSocketUrl(): String =
        BuildConfig.API_URL.replaceFirst("http", "ws") + "/messages/ws"
}
