package app.schuldashboard.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage

private val AVATAR_COLORS = listOf(
    0xFFAA47BD, 0xFF7B1FA2, 0xFF77919D, 0xFF455A65, 0xFFEC417A, 0xFFC1175C,
    0xFF0388D2, 0xFF0098A7, 0xFF004D40, 0xFFEF6C00, 0xFFF6511E,
).map(::Color)

/** Same letter and colour rule as the web client's generated avatars. */
@Composable
fun Avatar(name: String, pictureUrl: String? = null, size: Dp = 32.dp, modifier: Modifier = Modifier) {
    val letter = name.firstOrNull()?.uppercaseChar()?.toString() ?: "?"
    val hashChar = if (name.length >= 2) name[1] else name.firstOrNull() ?: ' '
    val color = if (name.isEmpty()) Color(0xFF777777) else AVATAR_COLORS[hashChar.code % AVATAR_COLORS.size]
    Box(
        modifier.size(size).clip(CircleShape).background(color),
        contentAlignment = Alignment.Center,
    ) {
        if (pictureUrl.isNullOrBlank()) {
            Text(letter, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = (size.value / 2).sp)
        } else {
            AsyncImage(pictureUrl, name, Modifier.size(size), contentScale = ContentScale.Crop)
        }
    }
}

/** Space the floating tab bar covers, so lists can scroll their last item clear of it. */
val LocalBottomInset = compositionLocalOf { 0.dp }

/** Space the header and status bar cover, which pages scroll up under. */
val LocalTopInset = compositionLocalOf { 0.dp }
