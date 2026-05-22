import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActiveTenantId } from '../common/decorators/tenant.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
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
    @Body() body: CreateMessageDto,
  ) {
    const message = await this.messagesService.createMessage(tenantId, userId, body);
    this.messagesGateway.broadcastMessage(tenantId, message);
    return message;
  }
}
