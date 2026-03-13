import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import {
  CurrentUserId,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { ActiveTenantId } from '../common/decorators/tenant.decorator';
import {
  UpdatePersonalizationDto,
  UpdateSetupDto,
  VisibilityStatusDto,
} from './dto/user.dto';

@UseGuards(JwtAuthGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Patch('personalization')
  updatePersonalization(
    @CurrentUserId() userId: string,
    @Body() body: UpdatePersonalizationDto,
  ) {
    return this.userService.updatePersonalization(userId, body.personalized);
  }

  @Patch('setup')
  updateSetup(@CurrentUser() user: AuthUser, @Body() body: UpdateSetupDto) {
    return this.userService.updateSetup(
      user.sub,
      user.globalRole,
      body.enrKurs,
      body.wpuKurs1,
      body.wpuKurs2,
      body.theater,
    );
  }

  @Get('checks')
  getChecks(@CurrentUserId() userId: string) {
    return this.userService.getChecks(userId);
  }

  @Get('pins')
  getPins(@CurrentUserId() userId: string) {
    return this.userService.getPins(userId);
  }

  @Get('visibility')
  getVisibility(@CurrentUserId() userId: string) {
    return this.userService.getVisibility(userId);
  }

  @UseGuards(TenantGuard)
  @Post('items/:id/visibility')
  setVisibility(
    @ActiveTenantId() tenantId: string,
    @Param('id') itemId: string,
    @CurrentUserId() userId: string,
    @Body() body: VisibilityStatusDto,
  ) {
    return this.userService.setVisibility(
      tenantId,
      itemId,
      userId,
      body.status,
    );
  }

  @Delete('items/:id/visibility')
  removeVisibility(
    @Param('id') itemId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.userService.removeVisibility(itemId, userId);
  }

  @Post('activity/pageload')
  logPageLoad(
    @CurrentUserId() userId: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.userService.logPageLoad(userId, userAgent || 'unknown');
  }

  @UseGuards(TenantGuard)
  @Post('items/:id/check')
  checkItem(
    @ActiveTenantId() tenantId: string,
    @Param('id') itemId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.userService.checkItem(tenantId, itemId, userId);
  }

  @Delete('items/:id/check')
  uncheckItem(@Param('id') itemId: string, @CurrentUserId() userId: string) {
    return this.userService.uncheckItem(itemId, userId);
  }

  @UseGuards(TenantGuard)
  @Post('items/:id/pin')
  pinItem(
    @ActiveTenantId() tenantId: string,
    @Param('id') itemId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.userService.pinItem(tenantId, itemId, userId);
  }

  @Delete('items/:id/pin')
  unpinItem(@Param('id') itemId: string, @CurrentUserId() userId: string) {
    return this.userService.unpinItem(itemId, userId);
  }
}
