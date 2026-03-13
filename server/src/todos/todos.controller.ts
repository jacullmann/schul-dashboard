import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TodosService } from './todos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { CreateTodoDto, UpdateTodoDto, ReorderTodoDto } from './dto/todos.dto';

@UseGuards(JwtAuthGuard)
@Controller('todos')
export class TodosController {
  constructor(private readonly todosService: TodosService) {}

  @Get()
  getTodos(@CurrentUserId() userId: string) {
    return this.todosService.getTodos(userId);
  }

  @Post()
  createTodo(@CurrentUserId() userId: string, @Body() body: CreateTodoDto) {
    return this.todosService.createTodo(userId, body.title, body.description);
  }

  @Put(':id')
  updateTodo(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateTodoDto,
  ) {
    return this.todosService.updateTodo(
      userId,
      id,
      body.title,
      body.description,
    );
  }

  @Patch(':id/toggle')
  toggleTodo(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.todosService.toggleTodo(userId, id);
  }

  @Patch(':id/reorder')
  reorderTodo(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: ReorderTodoDto,
  ) {
    return this.todosService.reorderTodo(
      userId,
      id,
      body.prevPosition,
      body.nextPosition,
    );
  }

  @Delete(':id')
  deleteTodo(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.todosService.deleteTodo(userId, id);
  }
}
