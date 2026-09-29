package app.schuldashboard.data

import app.schuldashboard.data.api.CreateItemRequest
import app.schuldashboard.data.api.HwItem
import app.schuldashboard.data.api.ReportRequest
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.UpdateItemRequest
import app.schuldashboard.data.api.requireSuccess
import javax.inject.Inject
import javax.inject.Singleton

data class ItemFilter(
    val type: String = "all",
    val old: Boolean = false,
    val subject: String? = null,
    val hideChecked: Boolean = false,
    val personalized: Boolean = false,
)

data class ItemsPage(val items: List<HwItem>, val hiddenByCourses: Int)

@Singleton
class TasksRepository @Inject constructor(private val api: SchulApi) {
    suspend fun items(groupId: String, filter: ItemFilter): ItemsPage {
        val response = api.items(
            groupId = groupId,
            type = filter.type,
            filter = if (filter.old) "old" else null,
            subject = filter.subject?.takeIf { it.isNotEmpty() },
            hideChecked = filter.hideChecked.takeIf { it },
            personalized = filter.personalized.takeIf { it },
        ).requireSuccess()
        val hidden = response.headers()["x-hidden-by-courses"]?.toIntOrNull() ?: 0
        return ItemsPage(response.body().orEmpty(), hidden)
    }

    suspend fun item(groupId: String, itemId: String): HwItem = api.item(groupId, itemId)

    suspend fun checkedIds(): Set<String> = api.checks().itemIds.toSet()

    suspend fun pinnedIds(): Set<String> = api.pins().itemIds.toSet()

    suspend fun setChecked(groupId: String, itemId: String, checked: Boolean) {
        (if (checked) api.checkItem(groupId, itemId) else api.uncheckItem(groupId, itemId)).requireSuccess()
    }

    suspend fun setPinned(groupId: String, itemId: String, pinned: Boolean) {
        (if (pinned) api.pinItem(groupId, itemId) else api.unpinItem(groupId, itemId)).requireSuccess()
    }

    suspend fun delete(groupId: String, itemId: String) {
        api.deleteItem(groupId, itemId).requireSuccess()
    }

    suspend fun report(groupId: String, item: HwItem, reason: String?) {
        api.reportItem(groupId, ReportRequest(item.id, item.title, reason)).requireSuccess()
    }

    suspend fun create(groupId: String, request: CreateItemRequest) {
        api.createItem(groupId, request).requireSuccess()
    }

    suspend fun update(groupId: String, itemId: String, request: UpdateItemRequest) {
        api.updateItem(groupId, itemId, request).requireSuccess()
    }
}
