import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantRoles } from '../common/decorators/roles.decorator';
import {
  ActiveTenantId,
  TenantRole,
} from '../common/decorators/tenant.decorator';
import {
  CurrentUserId,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import {
  CreateItemDto,
  UpdateItemDto,
  UpdateEditorNoteDto,
  AddImageToItemDto,
  ReportItemDto,
} from './dto/items.dto';

@UseGuards(JwtAuthGuard)
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @UseGuards(TenantGuard)
  @Get()
  getItems(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Query('type') type: string,
    @Query('filter') filter?: string,
  ) {
    return this.itemsService.getItems(tenantId, userId, type, filter);
  }

  @UseGuards(TenantGuard)
  @Get(':id')
  getItemById(@ActiveTenantId() tenantId: string, @Param('id') id: string) {
    return this.itemsService.getItemById(tenantId, id);
  }

  @UseGuards(TenantGuard)
  @Post()
  createItem(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateItemDto,
  ) {
    return this.itemsService.createItem(tenantId, userId, body);
  }

  @UseGuards(TenantGuard)
  @Patch(':id')
  updateItem(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateItemDto,
  ) {
    return this.itemsService.updateItem(tenantId, id, userId, body);
  }

  @UseGuards(TenantGuard)
  @Delete(':id')
  deleteItem(
    @ActiveTenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @TenantRole() tenantRole: string | undefined,
    @Param('id') id: string,
  ) {
    return this.itemsService.deleteItem(
      tenantId,
      id,
      user.sub,
      user.globalRole,
      tenantRole,
    );
  }

  @UseGuards(TenantGuard, RolesGuard)
  @TenantRoles('admin', 'moderator')
  @Patch(':id/note')
  updateItemNote(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateEditorNoteDto,
  ) {
    return this.itemsService.updateItemNote(
      tenantId,
      id,
      userId,
      body.editorNote,
    );
  }

  @UseGuards(TenantGuard)
  @Post(':id/images')
  addImage(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: AddImageToItemDto,
  ) {
    return this.itemsService.addImage(tenantId, id, userId, body.image);
  }

  @UseGuards(TenantGuard)
  @Delete(':itemId/images/:publicId')
  deleteImage(
    @ActiveTenantId() tenantId: string,
    @CurrentUser() user: AuthUser,
    @TenantRole() tenantRole: string | undefined,
    @Param('itemId') itemId: string,
    @Param('publicId') publicId: string,
  ) {
    return this.itemsService.deleteImage(
      tenantId,
      itemId,
      publicId,
      user.sub,
      user.globalRole,
      tenantRole,
    );
  }

  @Post('reports')
  reportItem(@CurrentUser() user: AuthUser, @Body() body: ReportItemDto) {
    return this.itemsService.reportItem(user.sub, user.email, body);
  }

  @Post('uploads/sign')
  createUploadSignature() {
    return this.itemsService.createUploadSignature();
  }
}
