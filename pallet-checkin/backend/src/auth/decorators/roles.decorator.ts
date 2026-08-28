import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// @Roles('ADMIN') on a route (or a whole controller) restricts it to that
// role — RolesGuard reads this metadata back off the handler/class. A
// route with no @Roles() at all is only gated by JwtAuthGuard (any
// authenticated user, regardless of role).
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
