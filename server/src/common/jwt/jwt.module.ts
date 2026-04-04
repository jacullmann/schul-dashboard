import { Global, Module } from '@nestjs/common';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { JwtService } from './jwt.service';

/**
 * JWT module that provides a custom JwtService wrapper.
 * This module should be imported in any feature module that needs JWT operations.
 * The wrapper handles both symmetric (HS256) and asymmetric (RS256) algorithms,
 * managing multiple JWT secrets transparently.
 */
@Global()
@Module({
  imports: [
    // Register NestJwtModule with a dummy secret (required by NestJS).
    // The actual secrets are injected per-operation in JwtService.
    NestJwtModule.register({ secret: 'dummy' }),
  ],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
