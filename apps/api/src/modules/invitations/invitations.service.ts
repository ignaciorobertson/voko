import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';
import { InvitationEntity } from '../../database/entities/invitation.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { BusinessMembershipEntity } from '../../database/entities/business-membership.entity';
import { BusinessEntity } from '../../database/entities/business.entity';
import { CreateInvitationDto, AcceptInvitationDto } from './dto/invitation.dto';
import { InvitationStatus, MembershipStatus, InvitationType, UserRole } from '@voko/shared';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async create(dto: CreateInvitationDto, invitedByUserId: string, businessId?: string) {
    const invRepo = this.dataSource.getRepository(InvitationEntity);
    const targetBusinessId = dto.businessId || businessId;

    if (!targetBusinessId && dto.role !== UserRole.ADMIN) {
      throw new BadRequestException('El identificador del negocio es obligatorio para invitar miembros');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días de vigencia

    let invitationType = InvitationType.CUSTOMER;
    if (dto.role === UserRole.STAFF) invitationType = InvitationType.STAFF;
    if (dto.role === UserRole.ADMIN || dto.role === UserRole.OWNER) invitationType = InvitationType.ADMIN;

    const invitation = await invRepo.save(
      invRepo.create({
        email: dto.email.trim().toLowerCase(),
        businessId: targetBusinessId,
        invitedByUserId,
        tokenHash,
        invitationType,
        status: InvitationStatus.PENDING,
        expiresAt,
      }),
    );

    this.logger.log(`Invitación generada para ${invitation.email} con rol ${dto.role}`);

    return {
      id: invitation.id,
      email: invitation.email,
      businessId: invitation.businessId,
      expiresAt: invitation.expiresAt,
      token: rawToken, // Token plano entregado solo en la creación para despacho seguro
    };
  }

  async verify(token: string) {
    if (!token) throw new BadRequestException('Token de invitación no provisto');

    const invRepo = this.dataSource.getRepository(InvitationEntity);
    const bizRepo = this.dataSource.getRepository(BusinessEntity);
    const tokenHash = this.hashToken(token);

    const invitation = await invRepo.findOne({ where: { tokenHash } });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada o token inválido');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Esta invitación ya ha sido utilizada');
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new BadRequestException('Esta invitación ha sido revocada');
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await invRepo.save(invitation);
      throw new BadRequestException('Esta invitación ha expirado');
    }

    let businessName = 'Voko Platform';
    if (invitation.businessId) {
      const biz = await bizRepo.findOneBy({ id: invitation.businessId });
      if (biz) businessName = biz.name;
    }

    return {
      valid: true,
      email: invitation.email,
      businessId: invitation.businessId,
      businessName,
      invitationType: invitation.invitationType,
      expiresAt: invitation.expiresAt,
    };
  }

  async accept(dto: AcceptInvitationDto, ip?: string, userAgent?: string) {
    const invRepo = this.dataSource.getRepository(InvitationEntity);
    const userRepo = this.dataSource.getRepository(UserEntity);
    const memRepo = this.dataSource.getRepository(BusinessMembershipEntity);
    const tokenHash = this.hashToken(dto.token);

    const invitation = await invRepo.findOne({ where: { tokenHash } });
    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada o token inválido');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('La invitación no se encuentra en estado pendiente');
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await invRepo.save(invitation);
      throw new BadRequestException('La invitación ha expirado');
    }

    // Buscar si el usuario ya existe con este email
    let user = await userRepo.findOne({ where: { email: invitation.email } });

    if (!user) {
      if (!dto.password) {
        throw new BadRequestException('Debe proporcionar una contraseña para crear su cuenta');
      }
      const passwordHash = await argon2.hash(dto.password);
      user = await userRepo.save(
        userRepo.create({
          firstName: dto.firstName?.trim() || 'Usuario',
          lastName: dto.lastName?.trim() || 'Invitado',
          email: invitation.email,
          passwordHash,
          isActive: true,
          emailVerifiedAt: new Date(),
        }),
      );
    }

    // Si la invitación está asociada a un negocio, crear la membresía
    if (invitation.businessId) {
      const existingMem = await memRepo.findOne({
        where: { businessId: invitation.businessId, userId: user.id },
      });

      if (!existingMem) {
        let role = UserRole.CUSTOMER;
        if (invitation.invitationType === InvitationType.STAFF) role = UserRole.STAFF;
        if (invitation.invitationType === InvitationType.ADMIN) role = UserRole.ADMIN;

        await memRepo.save(
          memRepo.create({
            businessId: invitation.businessId,
            userId: user.id,
            role,
            status: MembershipStatus.ACTIVE,
          }),
        );
      }
    }

    // Marcar invitación como aceptada (consumo único)
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await invRepo.save(invitation);

    // Iniciar sesión y retornar tokens
    return (this.authService as any).createSession(user, ip, userAgent);
  }

  async findByBusiness(businessId: string) {
    const invRepo = this.dataSource.getRepository(InvitationEntity);
    const invitations = await invRepo.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      invitationType: inv.invitationType,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
    }));
  }

  async revoke(businessId: string, invitationId: string) {
    const invRepo = this.dataSource.getRepository(InvitationEntity);
    const invitation = await invRepo.findOne({
      where: { id: invitationId, businessId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Solo se pueden revocar invitaciones en estado pendiente');
    }

    invitation.status = InvitationStatus.REVOKED;
    await invRepo.save(invitation);

    return { success: true, message: 'Invitación revocada exitosamente' };
  }
}

