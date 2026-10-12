import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TokenService } from './token.service';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { UserEntity } from '../../database/entities/user.entity';
import { AuthSessionEntity } from '../../database/entities/auth-session.entity';
import { PasswordResetEntity } from '../../database/entities/password-reset.entity';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly tokenService: TokenService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existing = await userRepo.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta registrada con este correo electrónico');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await userRepo.save(
      userRepo.create({
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: normalizedEmail,
        passwordHash,
        phone: dto.phone?.trim(),
        isActive: true,
        isSuperadmin: false,
      }),
    );

    return this.createSession(user, ip, userAgent);
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.createSession(user, ip, userAgent);
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Token de actualización no provisto');
    }

    const sessionRepo = this.dataSource.getRepository(AuthSessionEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const tokenHash = this.hashToken(refreshToken);

    const session = await sessionRepo.findOne({
      where: { refreshTokenHash: tokenHash },
    });

    if (!session) {
      throw new UnauthorizedException('Sesión inexistente o inválida');
    }

    if (session.isRevoked) {
      this.logger.warn(`Alerta de seguridad: intento de reutilización de refresh token revocado para el usuario ${session.userId}. Revocando todas las sesiones activas.`);
      await sessionRepo.update({ userId: session.userId }, { isRevoked: true });
      throw new UnauthorizedException('Sesión comprometida. Inicie sesión nuevamente.');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('La sesión ha expirado');
    }

    // Rotación obligatoria: revocar sesión anterior
    session.isRevoked = true;
    await sessionRepo.save(session);

    const user = await userRepo.findOneBy({ id: session.userId });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no disponible');
    }

    return this.createSession(user, ip, userAgent);
  }

  async logout(refreshToken: string): Promise<{ success: boolean }> {
    if (!refreshToken) return { success: true };

    const sessionRepo = this.dataSource.getRepository(AuthSessionEntity);
    const tokenHash = this.hashToken(refreshToken);

    await sessionRepo.update({ refreshTokenHash: tokenHash }, { isRevoked: true });
    return { success: true };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string; debugToken?: string }> {
    const userRepo = this.dataSource.getRepository(UserEntity);
    const resetRepo = this.dataSource.getRepository(PasswordResetEntity);
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await userRepo.findOne({ where: { email: normalizedEmail, isActive: true } });
    if (!user) {
      // Respuesta idempotente para evitar enumeración de correos
      return { message: 'Si el correo existe en el sistema, recibirá instrucciones para restablecer su contraseña.' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de vigencia

    await resetRepo.save(
      resetRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
        isUsed: false,
      }),
    );

    this.logger.log(`Solicitud de recuperación de contraseña generada para ${normalizedEmail}`);
    return {
      message: 'Si el correo existe en el sistema, recibirá instrucciones para restablecer su contraseña.',
      ...(process.env.NODE_ENV !== 'production' ? { debugToken: rawToken } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const resetRepo = this.dataSource.getRepository(PasswordResetEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const sessionRepo = this.dataSource.getRepository(AuthSessionEntity);
    const tokenHash = this.hashToken(dto.token);

    const resetRecord = await resetRepo.findOne({
      where: { tokenHash, isUsed: false },
    });

    if (!resetRecord || new Date() > resetRecord.expiresAt) {
      throw new BadRequestException('El enlace de restablecimiento es inválido o ha expirado');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);
    await userRepo.update(resetRecord.userId, { passwordHash: newPasswordHash });

    resetRecord.isUsed = true;
    await resetRepo.save(resetRecord);

    // Revocar todas las sesiones activas previas por seguridad
    await sessionRepo.update({ userId: resetRecord.userId }, { isRevoked: true });

    return { message: 'Contraseña actualizada con éxito. Puede iniciar sesión.' };
  }

  private async createSession(user: UserEntity, ip?: string, userAgent?: string) {
    const sessionRepo = this.dataSource.getRepository(AuthSessionEntity);

    // Generar Access Token JWT (15m)
    const accessToken = this.tokenService.sign({
      sub: user.id,
      email: user.email,
      isSuperadmin: user.isSuperadmin,
    });

    // Generar Refresh Token Criptográfico (7 días)
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await sessionRepo.save(
      sessionRepo.create({
        userId: user.id,
        refreshTokenHash,
        ipAddress: ip,
        userAgent,
        expiresAt,
        isRevoked: false,
      }),
    );

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isSuperadmin: user.isSuperadmin,
      },
    };
  }
}
