package app.schuldashboard.data

import app.schuldashboard.data.api.PrivateTaskDto
import app.schuldashboard.data.api.PrivateTaskRequest
import app.schuldashboard.data.api.SchulApi
import app.schuldashboard.data.api.requireSuccess
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PrivateTasksRepository @Inject constructor(private val api: SchulApi) {
    suspend fun all(): List<PrivateTaskDto> = api.privateTasks()

    suspend fun create(title: String, description: String) =
        api.createPrivateTask(PrivateTaskRequest(title, description))

    suspend fun update(task: PrivateTaskDto, title: String, description: String) =
        api.updatePrivateTask(task.id, PrivateTaskRequest(title, description, task.completed))

    /** The endpoint flips the stored value instead of setting it, so calls for one task must not overlap. */
    suspend fun toggle(id: String) = api.togglePrivateTask(id)

    suspend fun delete(id: String) {
        api.deletePrivateTask(id).requireSuccess()
    }
}
