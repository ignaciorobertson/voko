import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly expiresIn: string;

  constructor(private readonly configService: ConfigService) {
    this.secret =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'development_access_secret_change_in_production_min_32_chars';
    this.expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION') || '15m';
  }

  sign(payload: Record<string, unknown>, options?: jwt.SignOptions): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn as any,
      ...options,
    });
  }

  verify<T extends object = any>(token: string, options?: jwt.VerifyOptions): T {
    return jwt.verify(token, this.secret, options) as T;
  }

  decode(token: string): null | Record<string, unknown> | string {
    return jwt.decode(token);
  }
}
