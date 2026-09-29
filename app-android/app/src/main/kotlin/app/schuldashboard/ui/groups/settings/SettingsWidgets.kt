package app.schuldashboard.ui.groups.settings

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import app.schuldashboard.R
import app.schuldashboard.ui.design.Card
import app.schuldashboard.ui.design.FormActions
import app.schuldashboard.ui.design.FormGroup
import app.schuldashboard.ui.design.Modal
import app.schuldashboard.ui.design.Section
import app.schuldashboard.ui.design.TextField

/** A settings section: an h3 over its content, or a plain card when it has no title. */
@Composable
fun SectionCard(title: String? = null, description: String? = null, content: @Composable () -> Unit) {
    if (title != null) {
        Section(title, description = description) { content() }
    } else {
        Card(Modifier.fillMaxWidth()) {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) { content() }
        }
    }
}

@Composable
fun NumberField(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    FormGroup(modifier, label = label) {
        TextField(value, { onChange(it.filter(Char::isDigit)) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
    }
}

/** BaseDialog with the arguments this package passes; shown while composed. */
@Composable
fun ConfirmDialog(title: String, text: String, danger: Boolean = false, onDismiss: () -> Unit, onConfirm: () -> Unit) {
    app.schuldashboard.ui.design.ConfirmDialog(true, title, text, onDismiss, onConfirm, danger = danger)
}

/** A modal form with the site's stacked footer, shown while composed. */
@Composable
fun FormDialog(
    title: String,
    onDismiss: () -> Unit,
    onSubmit: () -> Unit,
    submitText: String = stringResource(R.string.action_save),
    enabled: Boolean = true,
    content: @Composable ColumnScope.() -> Unit,
) {
    Modal(true, onDismiss, title, actions = { FormActions(submitText, onSubmit, onDismiss, enabled = enabled) }) {
        Column(verticalArrangement = Arrangement.spacedBy(16.dp), content = content)
    }
}

@Composable
fun TextInputDialog(title: String, label: String, initial: String = "", onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var value by remember { mutableStateOf(initial) }
    FormDialog(title, onDismiss, { onConfirm(value) }, enabled = value.isNotBlank()) {
        FormGroup(label = label) { TextField(value, { value = it }) }
    }
}

