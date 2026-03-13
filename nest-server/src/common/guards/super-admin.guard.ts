import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    if (!user || user.globalRole !== 'superadmin') {
      throw new ForbiddenException('Superadmin-Rechte erforderlich');
    }
    
    return true;
  }
}
