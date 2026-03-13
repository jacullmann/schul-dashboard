import { SetMetadata } from '@nestjs/common';
import { TENANT_ROLES_KEY } from '../guards/roles.guard';

export const TenantRoles = (...roles: string[]) => SetMetadata(TENANT_ROLES_KEY, roles);
