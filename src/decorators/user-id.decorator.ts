import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    
    // Obtener el ID del usuario desde el JWT decodificado
    const userId = request.user?.id || request.user?.sub || request.userId;
    
    if (!userId) {
      console.error('User ID not found in request. Request user object:', request.user);
      throw new Error('User ID not found in request. Make sure the user is authenticated and the JWT contains the user ID.');
    }
    
    return userId;
  },
); 