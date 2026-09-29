package app.schuldashboard.ui.chat

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.Orientation
import androidx.compose.foundation.gestures.draggable
import androidx.compose.foundation.gestures.rememberDraggableState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.schuldashboard.R
import app.schuldashboard.data.api.MessageDto
import app.schuldashboard.domain.Group
import app.schuldashboard.domain.Permission
import app.schuldashboard.ui.common.Avatar
import app.schuldashboard.ui.common.Load
import app.schuldashboard.ui.common.LocalTopInset
import app.schuldashboard.ui.design.AppButton
import app.schuldashboard.ui.design.ButtonVariant
import app.schuldashboard.ui.design.EmptyState
import app.schuldashboard.ui.design.IconButton
import app.schuldashboard.ui.design.LocalToaster
import app.schuldashboard.ui.design.Menu
import app.schuldashboard.ui.design.MenuButton
import app.schuldashboard.ui.design.MenuDivider
import app.schuldashboard.ui.design.Spinner
import app.schuldashboard.ui.icons.Icon
import app.schuldashboard.ui.icons.Lucide
import app.schuldashboard.ui.tasks.ReportModal
import app.schuldashboard.ui.theme.AppText
import app.schuldashboard.ui.theme.AppTheme
import app.schuldashboard.ui.theme.Motion
import app.schuldashboard.ui.theme.Radius
import kotlinx.coroutines.launch
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle

/** Messages from one sender within an hour stack without repeating the name and avatar. */
private fun groupedWithPrevious(messages: List<MessageDto>, index: Int, firstNewId: String?): Boolean {
    if (index == 0 || messages[index].id == firstNewId) return false
    val previous = messages[index - 1]
    val current = messages[index]
    if (previous.userId != current.userId) return false
    val gap = runCatching { Duration.between(Instant.parse(previous.createdAt), Instant.parse(current.createdAt)) }.getOrNull()
    return gap != null && gap < Duration.ofHours(1)
}

@Composable
fun ChatScreen(group: Group, modifier: Modifier = Modifier, viewModel: ChatViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val toaster = LocalToaster.current
    LaunchedEffect(state.error) {
        state.error?.let {
            toaster.error(it)
            viewModel.clearError()
        }
    }

    Column(modifier.fillMaxSize().imePadding().navigationBarsPadding()) {
        Box(Modifier.weight(1f)) {
            when (val messages = state.messages) {
                Load.Loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Spinner(32.dp) }
                is Load.Failed -> ChatError(messages.message, viewModel::load)
                is Load.Ready -> MessageList(messages.value, state, group, viewModel)
            }
        }
        Composer(state, viewModel, canSend = group.can(Permission.SendMessages))
    }
}

@Composable
private fun ChatError(message: String?, onRetry: () -> Unit) {
    val colors = AppTheme.colors
    Column(
        Modifier.fillMaxSize().padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically),
    ) {
        Icon(Lucide.Info, null, size = 40.dp, tint = colors.danger)
        Text(message ?: stringResource(R.string.error_loading), style = AppText.sm, fontWeight = FontWeight.SemiBold, color = colors.danger)
        AppButton(onRetry, text = stringResource(R.string.action_retry))
    }
}

@Composable
private fun MessageList(messages: List<MessageDto>, state: ChatUiState, group: Group, viewModel: ChatViewModel) {
    val listState = rememberLazyListState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var menuFor by remember { mutableStateOf<MessageDto?>(null) }
    var reporting by remember { mutableStateOf<MessageDto?>(null) }
    // Messages present at first load appear at once; later ones rise in.
    val initialIds = remember { messages.map { it.id }.toSet() }

    LaunchedEffect(messages.size) { if (messages.isNotEmpty()) listState.animateScrollToItem(messages.lastIndex) }
    val atBottom by remember {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()
            last == null || last.index >= listState.layoutInfo.totalItemsCount - 1
        }
    }

    Box(Modifier.fillMaxSize()) {
        if (messages.isEmpty()) {
            EmptyState(stringResource(R.string.chat_no_messages), icon = Lucide.MessageCircle, modifier = Modifier.align(Alignment.Center))
        }
        LazyColumn(state = listState, contentPadding = PaddingValues(top = 16.dp + LocalTopInset.current, bottom = 16.dp), modifier = Modifier.fillMaxSize()) {
            itemsIndexed(messages, key = { _, m -> m.id }) { index, message ->
                Column(Modifier.animateItem(placementSpec = tween(400, easing = Motion.Settle)).then(if (message.id in initialIds) Modifier else Modifier.messageEnter())) {
                    if (message.id == state.firstNewMessageId) NewMessagesDivider()
                    val mine = message.userId == viewModel.currentUserId
                    MessageBubble(
                        message = message,
                        mine = mine,
                        grouped = groupedWithPrevious(messages, index, state.firstNewMessageId),
                        currentUserId = viewModel.currentUserId,
                        onReply = { viewModel.reply(message) },
                        onMenu = { menuFor = message },
                        onQuote = {
                            val target = messages.indexOfFirst { it.id == message.parentId }
                            if (target >= 0) scope.launch { listState.animateScrollToItem(target) }
                        },
                    )
                }
            }
            item(key = "typing") { TypingIndicator(state.typingNames) }
        }
        AnimatedVisibility(
            !atBottom,
            Modifier.align(Alignment.BottomEnd).padding(end = 16.dp, bottom = 32.dp),
            enter = fadeIn(tween(250, easing = Motion.Settle)) + scaleIn(tween(250, easing = Motion.Settle), 0.75f),
            exit = fadeOut(tween(250, easing = Motion.Settle)) + scaleOut(tween(250, easing = Motion.Settle), 0.75f),
        ) {
            IconButton(
                Lucide.ArrowDown, stringResource(R.string.chat_scroll_down),
                { scope.launch { listState.animateScrollToItem((listState.layoutInfo.totalItemsCount - 1).coerceAtLeast(0)) } },
                variant = ButtonVariant.Action,
            )
        }
    }

    val target = menuFor
    Menu(target != null, { menuFor = null }) {
        if (target != null) {
            val mine = target.userId == viewModel.currentUserId
            MenuButton(stringResource(R.string.action_reply), { menuFor = null; viewModel.reply(target) }, icon = Lucide.Reply)
            MenuButton(stringResource(R.string.chat_copy), {
                menuFor = null
                (context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager)
                    .setPrimaryClip(ClipData.newPlainText("message", target.content))
            }, icon = Lucide.Copy)
            MenuDivider()
            if (!mine) MenuButton(stringResource(R.string.action_report), { menuFor = null; reporting = target }, icon = Lucide.Flag)
            if (mine || group.can(Permission.DeleteOtherContent)) {
                MenuButton(stringResource(R.string.action_delete), { menuFor = null; viewModel.delete(target) }, icon = Lucide.Trash2, danger = true)
            }
        }
    }
    ReportModal(reporting != null, { reporting = null }) { reason ->
        reporting?.let { viewModel.report(it, reason) }
        reporting = null
    }
}

/** A new message rises 16dp from 97% scale while it fades in, over 400ms. */
private fun Modifier.messageEnter(): Modifier = composed {
    val progress = remember { Animatable(0f) }
    val rise = with(LocalDensity.current) { 16.dp.toPx() }
    LaunchedEffect(Unit) { progress.animateTo(1f, tween(400, easing = Motion.Settle)) }
    graphicsLayer {
        val p = progress.value
        alpha = p
        translationY = (1 - p) * rise
        scaleX = 0.97f + 0.03f * p
        scaleY = scaleX
    }
}

@Composable
private fun NewMessagesDivider() {
    Box(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 24.dp), contentAlignment = Alignment.Center) {
        Text(
            stringResource(R.string.chat_new_messages),
            Modifier.clip(CircleShape).background(AppTheme.colors.ghostHover).padding(horizontal = 16.dp, vertical = 6.dp),
            style = AppText.sm,
            fontWeight = FontWeight.Medium,
            color = AppTheme.colors.onGhost,
        )
    }
}

private val clockFormatter = DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT)

private fun clockTime(iso: String): String =
    runCatching { Instant.parse(iso).atZone(ZoneId.systemDefault()).format(clockFormatter) }.getOrDefault("")

/** Only emoji, up to three: shown large, and a single one without a bubble. */
private fun emojiCount(text: String): Int {
    if (text.isBlank()) return 0
    val it = java.text.BreakIterator.getCharacterInstance()
    it.setText(text)
    var count = 0
    var start = it.first()
    var end = it.next()
    while (end != java.text.BreakIterator.DONE) {
        val cluster = text.substring(start, end)
        val cp = cluster.codePointAt(0)
        val emoji = Character.getType(cp) == Character.OTHER_SYMBOL.toInt() || cp in 0x1F1E6..0x1F1FF || cp in 0x2600..0x27BF
        if (!emoji) return 0
        count++
        start = end
        end = it.next()
    }
    return count
}

/**
 * ChatMessageBubble: others' messages sit left in grey with their avatar, one's own right in
 * the action colour. The corner nearest the sender tightens on the first of a run. Swiping
 * right past 40dp replies; holding opens the menu.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MessageBubble(
    message: MessageDto,
    mine: Boolean,
    grouped: Boolean,
    currentUserId: String,
    onReply: () -> Unit,
    onMenu: () -> Unit,
    onQuote: () -> Unit,
) {
    val colors = AppTheme.colors
    val haptics = LocalHapticFeedback.current
    val density = LocalDensity.current
    val scope = rememberCoroutineScope()
    val swipe = remember { Animatable(0f) }
    val threshold = with(density) { 40.dp.toPx() }
    val maxSwipe = with(density) { 80.dp.toPx() }
    var raw by remember { mutableStateOf(0f) }

    val emoji = emojiCount(message.content)
    val hasQuote = message.parentId != null && message.parentContent != null
    val bare = emoji == 1 && !hasQuote
    val large = Radius.xl2
    val small = Radius.sm
    val shape = when {
        mine && grouped -> RoundedCornerShape(if (hasQuote) Radius.lg else large, if (hasQuote) Radius.lg else large, large, large)
        mine -> RoundedCornerShape(if (hasQuote) Radius.lg else large, small, large, large)
        grouped -> RoundedCornerShape(if (hasQuote) Radius.lg else large, if (hasQuote) Radius.lg else large, large, large)
        else -> RoundedCornerShape(small, large, large, large)
    }
    val background = when {
        bare -> androidx.compose.ui.graphics.Color.Transparent
        mine -> colors.action
        else -> colors.ghostHover
    }
    val content = if (mine && !bare) colors.onAction else colors.onGhost

    BoxWithConstraints(Modifier.fillMaxWidth().padding(horizontal = 8.dp).padding(top = if (grouped) 4.dp else 16.dp)) {
        val maxBubble = maxWidth * 0.85f
        Row(
            Modifier.align(if (mine) Alignment.CenterEnd else Alignment.CenterStart).widthIn(max = maxBubble),
            verticalAlignment = Alignment.Bottom,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (!mine) {
                Box(Modifier.width(32.dp).align(Alignment.Top)) { if (!grouped) Avatar(message.senderName.orEmpty(), size = 32.dp) }
            }
            Box {
                // The reply arrow the swipe uncovers.
                if (swipe.value > 0f) {
                    val armed = swipe.value >= threshold
                    val bg by animateColorAsState(if (armed) colors.action else colors.ghostHover, tween(150), label = "arrow")
                    Box(
                        Modifier.align(Alignment.CenterStart)
                            .graphicsLayer {
                                translationX = -with(density) { 32.dp.toPx() }
                                alpha = (swipe.value / threshold).coerceAtMost(1f)
                                val s = if (armed) 1f else 0.85f
                                scaleX = s
                                scaleY = s
                            }
                            .size(36.dp).clip(CircleShape).background(bg),
                        contentAlignment = Alignment.Center,
                    ) { Icon(Lucide.Reply, null, size = 18.dp, tint = if (armed) colors.onAction else colors.onGhostSubtle) }
                }
                Column(
                    Modifier
                        .graphicsLayer { translationX = swipe.value }
                        .draggable(
                            rememberDraggableState { delta ->
                                raw = (raw + delta).coerceAtLeast(0f)
                                val next = (raw * 0.5f).coerceAtMost(maxSwipe)
                                if (next >= threshold && swipe.value < threshold) haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                scope.launch { swipe.snapTo(next) }
                            },
                            Orientation.Horizontal,
                            onDragStopped = {
                                if (swipe.value >= threshold) onReply()
                                raw = 0f
                                swipe.animateTo(0f, tween(250, easing = Motion.Settle))
                            },
                        )
                        .clip(shape)
                        .background(background)
                        .combinedClickable(onClick = {}, onLongClick = {
                            haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                            onMenu()
                        })
                        .padding(8.dp),
                ) {
                    if (!mine && !grouped) {
                        Text(
                            message.senderName.orEmpty(),
                            Modifier.padding(horizontal = 8.dp).padding(bottom = 4.dp),
                            style = AppText.base.copy(lineHeight = 26.sp, letterSpacing = (-0.025).sp),
                            fontWeight = FontWeight.Bold,
                            color = colors.onGhost,
                        )
                    }
                    if (hasQuote) Quote(message, mine, currentUserId, onQuote)
                    Row(Modifier.padding(horizontal = 8.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val size = when (emoji) {
                            1 -> 48.sp
                            2 -> 30.sp
                            3 -> 20.sp
                            else -> 16.sp
                        }
                        Text(
                            message.content,
                            Modifier.weight(1f, fill = false).padding(vertical = 1.dp),
                            style = AppText.base.copy(fontSize = size, lineHeight = size * 1.375f),
                            color = content,
                        )
                        Text(
                            clockTime(message.createdAt),
                            style = AppText.xs,
                            color = if (mine && !bare) colors.onActionMuted.copy(alpha = 0.7f) else colors.onGhostSubtle,
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
/** The quoted message above a reply: a tinted block with a bar down its left edge. */
@Composable
private fun Quote(message: MessageDto, mine: Boolean, currentUserId: String, onClick: () -> Unit) {
    val colors = AppTheme.colors
    val bar = if (mine) colors.onActionMuted else colors.onGhostMuted
    Column(
        Modifier.fillMaxWidth().padding(bottom = 4.dp, top = if (mine) 0.dp else 4.dp)
            .clip(RoundedCornerShape(Radius.md))
            .background(if (mine) colors.actionHover else colors.ghostHover)
            .drawBehind { drawRect(bar, size = Size(4.dp.toPx(), size.height)) }
            .combinedClickable(onClick = onClick)
            .padding(start = 16.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
    ) {
        val muted = if (mine) colors.onActionMuted else colors.onGhostMuted
        Text(
            if (message.userId == currentUserId && message.parentSenderName == null) stringResource(R.string.chat_you)
            else message.parentSenderName.orEmpty(),
            style = AppText.sm, fontWeight = FontWeight.Bold, color = muted,
        )
        Text(message.parentContent.orEmpty(), style = AppText.sm, color = muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

/** The typing line: three dots in a wave beside who is typing. */
@Composable
private fun TypingIndicator(names: Set<String>) {
    val colors = AppTheme.colors
    Box(Modifier.fillMaxWidth().height(24.dp).padding(horizontal = 24.dp).padding(top = 0.dp), contentAlignment = Alignment.CenterStart) {
        AnimatedVisibility(names.isNotEmpty(), enter = fadeIn(tween(200)), exit = fadeOut(tween(200))) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                val transition = rememberInfiniteTransition(label = "typing")
                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    repeat(3) { i ->
                        val phase by transition.animateFloat(
                            0f, 1f,
                            infiniteRepeatable(tween(550, easing = Motion.EaseInOut), RepeatMode.Reverse, StartOffset(i * 180)),
                            label = "dot$i",
                        )
                        Box(
                            Modifier.graphicsLayer {
                                translationY = -3.5f * density * phase
                                alpha = 0.4f + 0.6f * phase
                            }.size(6.dp).clip(CircleShape).background(colors.action),
                        )
                    }
                }
                Text(
                    stringResource(R.string.chat_typing, names.joinToString()),
                    style = AppText.sm, fontWeight = FontWeight.Bold, color = colors.onGhostMuted,
                )
            }
        }
    }
}

/**
 * ChatInput: a 24dp-rounded field that shows the message being answered above the text, and
 * the round send button beside it.
 */
@Composable
private fun Composer(state: ChatUiState, viewModel: ChatViewModel, canSend: Boolean) {
    val colors = AppTheme.colors
    val interaction = remember { MutableInteractionSource() }
    val focused by interaction.collectIsFocusedAsState()
    val border by animateColorAsState(if (focused) colors.focus else colors.ghostBorder, Motion.focus(), label = "border")
    val ring by animateDpAsState(if (focused) 3.dp else 0.dp, Motion.focus(), label = "ring")
    val reply = state.replyTo
    val radius = if (reply != null) Radius.lg else Radius.xl2
    val shape = RoundedCornerShape(radius)

    Row(Modifier.padding(start = 8.dp, end = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Column(
            Modifier.weight(1f)
                .drawBehind {
                    val grow = ring.toPx()
                    if (grow > 0f) {
                        drawRoundRect(
                            colors.focusRing, Offset(-grow, -grow), Size(size.width + grow * 2, size.height + grow * 2),
                            CornerRadius(radius.toPx() + grow),
                        )
                    }
                }
                .clip(shape)
                .background(colors.surface)
                .border(1.dp, border, shape)
                .heightIn(min = 40.dp)
                .padding(9.dp),
        ) {
            AnimatedVisibility(
                reply != null,
                enter = expandVertically(tween(250, easing = Motion.Settle)) + fadeIn(tween(200)),
                exit = shrinkVertically(tween(250, easing = Motion.Settle)) + fadeOut(tween(200)),
            ) {
                var shown by remember { mutableStateOf(reply) }
                if (reply != null) shown = reply
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 8.dp).clip(RoundedCornerShape(Radius.md))
                        .background(colors.ghostHover)
                        .drawBehind { drawRect(colors.onGhostMuted, size = Size(4.dp.toPx(), size.height)) }
                        .padding(start = 16.dp, end = 4.dp, top = 4.dp, bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(Modifier.weight(1f)) {
                        Text(shown?.senderName.orEmpty(), style = AppText.sm, fontWeight = FontWeight.Bold, color = colors.onGhost, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(shown?.content.orEmpty(), style = AppText.sm, color = colors.onGhostMuted, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    IconButton(Lucide.X, stringResource(R.string.chat_cancel_reply), { viewModel.reply(null) })
                }
            }
            val style = AppText.base.copy(lineHeight = 20.sp, color = colors.onGhost)
            BasicTextField(
                state.input,
                { viewModel.onInput(it.take(1000)) },
                Modifier.fillMaxWidth().padding(horizontal = 7.dp, vertical = 1.dp),
                enabled = canSend,
                textStyle = style,
                maxLines = 5,
                interactionSource = interaction,
                cursorBrush = SolidColor(colors.onGhost),
                decorationBox = { field ->
                    Box {
                        if (state.input.isEmpty()) {
                            Text(
                                stringResource(if (canSend) R.string.chat_placeholder else R.string.chat_no_permission),
                                style = style, color = colors.onGhostSubtle, maxLines = 1, overflow = TextOverflow.Ellipsis,
                            )
                        }
                        field()
                    }
                },
            )
        }
        IconButton(
            Lucide.SendHorizontal, stringResource(R.string.action_send), viewModel::send,
            variant = ButtonVariant.Action, enabled = canSend && state.input.isNotBlank(),
        )
    }
}
