import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import {
  ActiveTenantId,
  TenantRole,
} from '../common/decorators/tenant.decorator';
import {
  CurrentUserId,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { CreateMessageDto } from './dto/create-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly messagesGateway: MessagesGateway,
  ) {}

  @UseGuards(TenantGuard)
  @Get()
  async getMessages(@ActiveTenantId() tenantId: string) {
    return this.messagesService.getMessages(tenantId);
  }

  @UseGuards(TenantGuard)
  @Post()
  async createMessage(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @TenantRole() tenantRole: string | undefined,
    @CurrentUser() user: AuthUser,
    @Body() body: CreateMessageDto,
  ) {
    const message = await this.messagesService.createMessage(
      tenantId,
      userId,
      tenantRole,
      user.globalRole,
      body,
    );
    this.messagesGateway.broadcastMessage(tenantId, message);
    return message;
  }

  @UseGuards(TenantGuard)
  @Delete(':id')
  async deleteMessage(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @TenantRole() tenantRole: string | undefined,
    @CurrentUser() user: AuthUser,
    @Param('id') messageId: string,
  ) {
    await this.messagesService.deleteMessage(
      tenantId,
      userId,
      tenantRole,
      user.globalRole,
      messageId,
    );
    this.messagesGateway.broadcastMessageDeleted(tenantId, messageId);
    return { ok: true };
  }
}
